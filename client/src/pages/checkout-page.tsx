import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Event } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { CheckIcon, CreditCard, Smartphone, Loader2, SearchIcon, CalendarIcon, MapPinIcon, ChevronRightIcon } from "lucide-react";
import { paymentService, type PaymentRequest } from "@/services/payment";
import { useAuth } from "@/hooks/use-auth";
import { MobileNav } from "@/components/ui/mobile-nav";

const bookingSchema = z.object({
  buyerName: z.string().min(2, "Name is required"),
  buyerEmail: z.string().email("Valid email is required"),
  buyerPhone: z.string().min(10, "Valid phone number is required"),
  ticketQuantity: z.number().min(1, "At least 1 ticket required"),
  paymentMethod: z.enum(["mpesa", "card"]),
});

type PaymentStep = "details" | "payment" | "processing" | "success" | "failed";

export default function CheckoutPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<PaymentStep>("details");
  const [paymentStatus, setPaymentStatus] = useState<string>("");
  const [checkoutRequestID, setCheckoutRequestID] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Get ticket quantity from URL
  const searchParams = new URLSearchParams(window.location.search);
  const initialQuantity = parseInt(searchParams.get('quantity') || '1');

  // Queries
  const { data: event } = useQuery<Event>({
    queryKey: ["/api/events", parseInt(eventId)],
    enabled: !!eventId,
  });

  // Form setup
  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      buyerName: user?.fullName || "",
      buyerEmail: user?.email || "",
      buyerPhone: "",
      ticketQuantity: initialQuantity,
      paymentMethod: "mpesa",
    },
  });

  // Calculate total price
  const ticketQuantity = form.watch("ticketQuantity");
  const totalPrice = event ? event.price * ticketQuantity : 0;

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof bookingSchema>) => {
      const res = await apiRequest("POST", "/api/bookings", {
        ...data,
        eventId: parseInt(eventId),
        totalPrice,
        paymentStatus: "pending",
      });
      if (!res.ok) throw new Error((await res.json()).message || "Booking failed");
      return await res.json();
    },
    onSuccess: (booking) => {
      // If M-Pesa payment, initiate STK Push
      if (form.getValues("paymentMethod") === "mpesa") {
        initiateMpesaPayment(booking);
      } else if (form.getValues("paymentMethod") === "card") {
        // For Pesapal card payments
        initiatePesapalPayment(booking);
      } else {
        // For other payment methods
        setCurrentStep("success");
        toast({
          title: "Booking successful!",
          description: "Your tickets have been booked successfully.",
        });
      }
    },
    onError: (error: any) => {
      setCurrentStep("failed");
      toast({
        title: "Booking failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initiate Pesapal payment
  const initiatePesapalPayment = async (booking: any) => {
    setCurrentStep("processing");
    setPaymentStatus("Initiating Pesapal payment...");

    try {
      const response = await paymentService.initiatePesapalPayment({
        amount: totalPrice,
        reference: `BOOKING-${booking.id}`,
        description: `Payment for ${event?.title} - ${booking.ticketQuantity} ticket(s)`,
        buyerName: form.getValues("buyerName"),
        buyerEmail: form.getValues("buyerEmail"),
        buyerPhone: form.getValues("buyerPhone"),
        currency: 'KES'
      });

      if (response.success && response.checkoutUrl) {
        setPaymentStatus("Redirecting to Pesapal...");
        
        // Open Pesapal checkout in a new window/tab
        const pesapalWindow = window.open(response.checkoutUrl, '_blank', 'width=800,height=600');
        
        if (pesapalWindow) {
          // Start polling for payment status
          const pollInterval = setInterval(async () => {
            try {
              const statusResponse = await paymentService.checkPesapalPaymentStatus(response.orderTrackingId!);
              
              if (statusResponse.success && statusResponse.status === 'completed') {
                clearInterval(pollInterval);
                pesapalWindow.close();
                setCurrentStep("success");
                toast({
                  title: "Payment confirmed!",
                  description: "Your payment has been processed successfully.",
                });
              } else if (statusResponse.success && statusResponse.status === 'failed') {
                clearInterval(pollInterval);
                pesapalWindow.close();
                setCurrentStep("failed");
                toast({
                  title: "Payment failed",
                  description: statusResponse.errorMessage || "Payment was not completed",
                  variant: "destructive",
                });
              }
            } catch (error) {
              console.error("Status check failed:", error);
            }
          }, 5000); // Poll every 5 seconds

          // Stop polling after 10 minutes
          setTimeout(() => {
            clearInterval(pollInterval);
            if (currentStep === "processing") {
              pesapalWindow.close();
              setCurrentStep("failed");
              toast({
                title: "Payment timeout",
                description: "Payment took too long. Please try again.",
                variant: "destructive",
              });
            }
          }, 600000);
        } else {
          // If popup blocked, redirect in same window
          setPaymentStatus("Redirecting to payment page...");
          window.location.href = response.checkoutUrl;
        }
      } else {
        setCurrentStep("failed");
        toast({
          title: "Payment initiation failed",
          description: response.errorMessage || "Failed to initiate payment",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Pesapal payment initiation failed:", error);
      setCurrentStep("failed");
      toast({
        title: "Payment failed",
        description: "An error occurred during payment",
        variant: "destructive",
      });
    }
  };

  // Initiate M-Pesa payment
  const initiateMpesaPayment = async (booking: any) => {
    setCurrentStep("processing");
    setPaymentStatus("Initiating payment...");

    try {
      const paymentRequest: PaymentRequest = {
        phoneNumber: form.getValues("buyerPhone"),
        amount: totalPrice,
        reference: `BOOKING-${booking.id}`,
        description: `Tickets for ${event?.title}`,
      };

      const result = await paymentService.initiateMpesaPayment(paymentRequest);

      if (result.success && result.checkoutRequestID) {
        setCheckoutRequestID(result.checkoutRequestID);
        setPaymentStatus("Payment initiated. Please check your phone for M-Pesa prompt...");
        
        // Poll for payment status
        const statusResult = await paymentService.pollPaymentStatus(result.checkoutRequestID);
        
        if (statusResult.success && statusResult.status === "completed") {
          setCurrentStep("success");
          toast({
            title: "Payment confirmed!",
            description: "Your payment has been processed successfully.",
          });
        } else if (statusResult.success && statusResult.status === "pending") {
          setCurrentStep("success");
          toast({
            title: "Payment initiated!",
            description: "Payment is being processed. Please check your email for confirmation.",
          });
        } else {
          setCurrentStep("failed");
          toast({
            title: "Payment failed",
            description: statusResult.errorMessage || "Payment was not completed",
            variant: "destructive",
          });
        }
      } else {
        setCurrentStep("failed");
        toast({
          title: "Payment initiation failed",
          description: result.errorMessage || "Failed to initiate payment",
          variant: "destructive",
        });
      }
    } catch (error) {
      setCurrentStep("failed");
      toast({
        title: "Payment failed",
        description: "An error occurred during payment",
        variant: "destructive",
      });
    }
  };

  // Process booking
  const onSubmit = (values: z.infer<typeof bookingSchema>) => {
    setCurrentStep("payment");
    createBookingMutation.mutate(values);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/events?search=${encodeURIComponent(searchQuery)}`);
  };

  if (!event) {
    return (
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="backdrop-blur-md bg-white/80 shadow-sm sticky top-0 z-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 sm:h-20 items-center">
              <div className="flex items-center gap-4 sm:gap-8">
                <Link href="/">
                  <span className="text-primary text-2xl sm:text-3xl font-extrabold tracking-tight cursor-pointer drop-shadow-sm">StarEvents</span>
                </Link>
                <nav className="hidden sm:flex sm:space-x-4 items-center">
                  <Link href="/events">
                    <a className="px-3 py-2 rounded-lg font-medium text-slate-700 hover:bg-primary/10 hover:text-primary transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">Explore Events</a>
                  </Link>
                  <Link href="/calendar">
                    <a className="px-3 py-2 rounded-lg font-medium text-slate-700 hover:bg-primary/10 hover:text-primary transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">Calendar</a>
                  </Link>
                </nav>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <form onSubmit={handleSearch} className="relative hidden md:block">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-slate-400" />
                  </div>
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white/80 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm shadow-sm transition"
                    placeholder="Search events..."
                    style={{ minWidth: 220 }}
                  />
                </form>
                {user ? (
                  <Link href={user.isAdmin ? "/admin" : "/dashboard"}>
                    <button className="bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary border border-slate-200 shadow-sm">
                      <img 
                        className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" 
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=random`} 
                        alt={user.fullName}
                      />
                    </button>
                  </Link>
                ) : (
                  <Link href="/auth">
                    <Button variant="default" className="hidden sm:inline-flex ml-2 px-4 sm:px-6 py-2 text-sm sm:text-base font-semibold shadow-md bg-primary text-white hover:bg-primary/90 rounded-lg transition">Sign In</Button>
                  </Link>
                )}
                <MobileNav 
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onSearchSubmit={handleSearch}
                  currentPath="/checkout"
                />
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-t-2 border-primary rounded-full"></div>
        </div>

        {/* Footer */}
        <footer className="bg-slate-800 text-white">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="md:grid md:grid-cols-4 md:gap-8">
              <div>
                <h3 className="text-2xl font-bold">StarEvents</h3>
                <p className="mt-4 text-slate-300">
                  The easiest way to discover and book tickets for your favorite events.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4 mt-8 md:mt-0">Categories</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-slate-300 hover:text-white">All Events</a></li>
                  <li><a href="#" className="text-slate-300 hover:text-white">Featured</a></li>
                  <li><a href="#" className="text-slate-300 hover:text-white">Upcoming</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4 mt-8 md:mt-0">Links</h3>
                <ul className="space-y-2">
                  <li><Link href="/"><a className="text-slate-300 hover:text-white">Home</a></Link></li>
                  <li><Link href="/events"><a className="text-slate-300 hover:text-white">Events</a></Link></li>
                  <li><Link href="/calendar"><a className="text-slate-300 hover:text-white">Calendar</a></Link></li>
                  {user && <li><Link href="/dashboard"><a className="text-slate-300 hover:text-white">My Dashboard</a></Link></li>}
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4 mt-8 md:mt-0">Contact</h3>
                <ul className="space-y-2">
                  <li><a href="mailto:support@starevents.com" className="text-slate-300 hover:text-white transition-colors">support@starevents.com</a></li>
                  <li><a href="tel:+254741991213" className="text-slate-300 hover:text-white transition-colors">+254 741 991 213</a></li>
                </ul>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-slate-700">
              <div className="flex items-center justify-center gap-3">
                <img 
                  src="/workingwavewhitelogo.jpg" 
                  alt="Working Wave Logo" 
                  className="h-6 w-auto opacity-80 hover:opacity-100 transition-opacity"
                />
                <p className="text-slate-400 text-center">
                  <a href="https://working-wave.vercel.app/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    Working Wave © 2025. All Right Reserved.
                  </a>
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="backdrop-blur-md bg-white/80 shadow-sm sticky top-0 z-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 sm:h-20 items-center">
            <div className="flex items-center gap-4 sm:gap-8">
              <Link href="/">
                <span className="text-primary text-2xl sm:text-3xl font-extrabold tracking-tight cursor-pointer drop-shadow-sm">StarEvents</span>
              </Link>
              <nav className="hidden sm:flex sm:space-x-4 items-center">
                <Link href="/events">
                  <a className="px-3 py-2 rounded-lg font-medium text-slate-700 hover:bg-primary/10 hover:text-primary transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">Explore Events</a>
                </Link>
                <Link href="/calendar">
                  <a className="px-3 py-2 rounded-lg font-medium text-slate-700 hover:bg-primary/10 hover:text-primary transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">Calendar</a>
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <form onSubmit={handleSearch} className="relative hidden md:block">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <SearchIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white/80 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm shadow-sm transition"
                  placeholder="Search events..."
                  style={{ minWidth: 220 }}
                />
              </form>
              {user ? (
                <Link href={user.isAdmin ? "/admin" : "/dashboard"}>
                  <button className="bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary border border-slate-200 shadow-sm">
                    <img 
                      className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=random`} 
                      alt={user.fullName}
                    />
                  </button>
                </Link>
              ) : (
                <Link href="/auth">
                  <Button variant="default" className="hidden sm:inline-flex ml-2 px-4 sm:px-6 py-2 text-sm sm:text-base font-semibold shadow-md bg-primary text-white hover:bg-primary/90 rounded-lg transition">Sign In</Button>
                </Link>
              )}
              <MobileNav 
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSearchSubmit={handleSearch}
                currentPath="/checkout"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 bg-slate-50 py-4 sm:py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Event Summary Card - Mobile Friendly */}
          <div className="mb-6 sm:mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="relative h-48 sm:h-64">
                <img 
                  src={event.imageUrl} 
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white">
                  <div className="text-sm font-medium mb-2 flex items-center gap-2">
                    <CalendarIcon className="inline-block h-4 w-4" />
                    {format(new Date(event.date), 'EEE, MMM d, yyyy • h:mm a')}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold mb-2 leading-tight">{event.title}</h1>
                  <div className="flex items-center text-sm sm:text-base mb-3">
                    <MapPinIcon className="inline-block h-4 w-4 mr-2" />
                    {event.venue}, {event.location}
                  </div>
                  <div className="text-white font-bold text-lg sm:text-xl">
                    KES {event.price.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Checkout Form */}
          <div className="space-y-6">
            {currentStep === "success" ? (
              <Card className="w-full max-w-md mx-auto">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-100 mx-auto flex items-center justify-center">
                    <CheckIcon className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" />
                  </div>
                  <CardTitle className="text-xl sm:text-2xl mt-4">Payment Initiated!</CardTitle>
                  <CardDescription className="text-base">
                Your payment has been initiated successfully. Please check your email for confirmation once payment is processed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-t border-b border-slate-200 py-4">
                    <p className="text-center text-slate-600 text-sm sm:text-base">
                  A confirmation email has been sent to your email address.
                </p>
              </div>
              <div className="text-center">
                    <p className="text-slate-600 text-sm sm:text-base">Enjoy the event!</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Link href="/events">
                    <Button className="h-12 text-base px-8">Back to Events</Button>
              </Link>
            </CardFooter>
          </Card>
            ) : currentStep === "failed" ? (
              <Card className="w-full max-w-md mx-auto">
                <CardHeader className="text-center">
                  <CardTitle className="text-xl sm:text-2xl text-red-600">Payment Failed</CardTitle>
                  <CardDescription className="text-base">
                    There was an issue with your payment. Please try again.
                  </CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-center">
                  <Button 
                    onClick={() => setCurrentStep("details")} 
                    className="h-12 text-base px-8"
                  >
                    Try Again
                  </Button>
                </CardFooter>
              </Card>
            ) : currentStep === "processing" ? (
              <Card className="w-full max-w-md mx-auto">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-100 mx-auto flex items-center justify-center">
                    <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600 animate-spin" />
                  </div>
                  <CardTitle className="text-xl sm:text-2xl mt-4">Processing Payment</CardTitle>
                  <CardDescription className="text-base">
                    {paymentStatus}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-sm sm:text-base text-slate-600 space-y-2">
                    <p>Please complete the payment on your phone</p>
                    <p className="font-medium">Do not close this page</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="w-full">
            <CardHeader>
                  <CardTitle className="text-xl sm:text-2xl">Complete Your Booking</CardTitle>
                  <CardDescription className="text-base">
                    Enter your details to secure your tickets
                  </CardDescription>
            </CardHeader>
            <CardContent>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Personal Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900">Personal Information</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                          <Label htmlFor="buyerName" className="text-sm font-medium">Full Name</Label>
                          <Input 
                            id="buyerName" 
                            placeholder="John Doe" 
                            {...form.register("buyerName")} 
                            className="h-12 text-base" 
                          />
                  {form.formState.errors.buyerName && (
                            <p className="text-xs text-red-500">{form.formState.errors.buyerName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                          <Label htmlFor="buyerEmail" className="text-sm font-medium">Email Address</Label>
                          <Input 
                            id="buyerEmail" 
                            placeholder="your@email.com" 
                            {...form.register("buyerEmail")} 
                            className="h-12 text-base" 
                          />
                  {form.formState.errors.buyerEmail && (
                            <p className="text-xs text-red-500">{form.formState.errors.buyerEmail.message}</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="buyerPhone" className="text-sm font-medium">Phone Number (M-Pesa)</Label>
                        <Input 
                          id="buyerPhone" 
                          placeholder="0712345678" 
                          {...form.register("buyerPhone")} 
                          className="h-12 text-base" 
                        />
                        {form.formState.errors.buyerPhone && (
                          <p className="text-xs text-red-500">{form.formState.errors.buyerPhone.message}</p>
                  )}
                </div>
                    </div>

                    {/* Ticket Details */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900">Ticket Details</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                          <Label htmlFor="ticketQuantity" className="text-sm font-medium">Number of Tickets</Label>
                  <Input
                    id="ticketQuantity"
                    type="number"
                    min={1}
                    max={event.availableSeats}
                    {...form.register("ticketQuantity", { valueAsNumber: true })}
                            className="h-12 text-base"
                  />
                  {form.formState.errors.ticketQuantity && (
                            <p className="text-xs text-red-500">{form.formState.errors.ticketQuantity.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="paymentMethod" className="text-sm font-medium">Payment Method</Label>
                          <Select onValueChange={(value) => form.setValue("paymentMethod", value as "mpesa" | "card")} defaultValue={form.getValues("paymentMethod")}>
                            <SelectTrigger className="h-12 text-base">
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mpesa">
                                <div className="flex items-center gap-2">
                                  <Smartphone className="h-4 w-4" />
                                  M-Pesa
                                </div>
                              </SelectItem>
                              <SelectItem value="card">
                                <div className="flex items-center gap-2">
                                  <CreditCard className="h-4 w-4" />
                                  Card Payment
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {form.formState.errors.paymentMethod && (
                            <p className="text-xs text-red-500">{form.formState.errors.paymentMethod.message}</p>
                  )}
                </div>
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-slate-50 p-4 sm:p-6 rounded-lg space-y-3">
                      <h3 className="text-lg font-semibold text-slate-900">Order Summary</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm sm:text-base">
                          <span className="text-slate-600">Price per ticket:</span>
                          <span className="font-medium">KES {event.price.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm sm:text-base">
                          <span className="text-slate-600">Quantity:</span>
                          <span className="font-medium">{ticketQuantity}</span>
                        </div>
                        <div className="border-t border-slate-200 pt-2 flex justify-between text-base sm:text-lg font-semibold">
                          <span>Total:</span>
                          <span className="text-primary">KES {totalPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button 
                      type="submit" 
                      className="w-full h-14 text-lg font-semibold" 
                      disabled={createBookingMutation.isPending}
                    >
                      {createBookingMutation.isPending ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Processing...
                </div>
                      ) : (
                        `Pay KES ${totalPrice.toFixed(2)}`
                      )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-800 text-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
                              <h3 className="text-2xl font-bold">StarEvents</h3>
              <p className="mt-4 text-slate-300">
                The easiest way to discover and book tickets for your favorite events.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Help</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-slate-300 hover:text-white">FAQs</a></li>
                <li><a href="#" className="text-slate-300 hover:text-white">Contact Us</a></li>
                <li><a href="#" className="text-slate-300 hover:text-white">Ticket Info</a></li>
                <li><a href="#" className="text-slate-300 hover:text-white">Refunds</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-slate-300 hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="text-slate-300 hover:text-white">Privacy Policy</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Subscribe</h3>
              <p className="text-slate-300 mb-4">
                Get updates on new events and exclusive offers.
              </p>
              <form className="mt-2">
                <div className="flex">
                  <input id="email-address" name="email" type="email" autoComplete="email" required className="min-w-0 w-full bg-white border border-transparent rounded-md py-2 px-4 text-base text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white focus:border-white" placeholder="Enter your email" />
                  <div className="ml-3 flex-shrink-0">
                    <button type="submit" className="w-full bg-primary border border-transparent rounded-md py-2 px-4 flex items-center justify-center text-base font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-primary">
                      Subscribe
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
                      <div className="mt-12 pt-8 border-t border-slate-700">
              <div className="flex items-center justify-center gap-3">
                <img 
                  src="/workingwavewhitelogo.jpg" 
                  alt="Working Wave Logo" 
                  className="h-6 w-auto opacity-80 hover:opacity-100 transition-opacity"
                />
                <p className="text-slate-400 text-center">
                  <a href="https://working-wave.vercel.app/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    Working Wave © 2025. All Right Reserved.
                  </a>
                </p>
              </div>
            </div>
        </div>
      </footer>
    </div>
  );
}
