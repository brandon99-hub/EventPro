import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Event, Seat, Booking } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { CreditCard, CheckIcon, AlertCircle } from "lucide-react";
import { Link } from "wouter";

const paymentSchema = z.object({
  cardName: z.string().min(2, "Name on card is required"),
  cardNumber: z.string().regex(/^\d{16}$/, "Card number must be 16 digits"),
  expiryDate: z.string().regex(/^\d{2}\/\d{2}$/, "Expiry date must be in format MM/YY"),
  cvv: z.string().regex(/^\d{3,4}$/, "CVV must be 3 or 4 digits"),
});

export default function CheckoutPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Get seat IDs from URL
  const searchParams = new URLSearchParams(window.location.search);
  const seatIdsParam = searchParams.get('seats');
  const seatIds = seatIdsParam ? seatIdsParam.split(',').map(id => parseInt(id)) : [];

  // Form setup
  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      cardName: "",
      cardNumber: "",
      expiryDate: "",
      cvv: "",
    },
  });

  // Queries
  const { data: event } = useQuery<Event>({
    queryKey: ["/api/events", parseInt(eventId)],
    enabled: !!eventId,
  });

  const { data: seats = [] } = useQuery<Seat[]>({
    queryKey: ["/api/seats", { ids: seatIds }],
    enabled: seatIds.length > 0,
  });

  // Calculate total price
  const totalPrice = seats.reduce((sum, seat) => sum + seat.price, 0);

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (data: {
      userId: number;
      eventId: number;
      seatIds: string;
      totalPrice: number;
    }) => {
      const res = await apiRequest("POST", "/api/bookings", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/bookings"] });
      setIsSuccess(true);
      setIsProcessing(false);
      
      // Show success toast
      toast({
        title: "Booking successful!",
        description: "Your tickets have been booked successfully.",
      });
      
      // Redirect to user dashboard after 3 seconds
      setTimeout(() => {
        navigate("/dashboard");
      }, 3000);
    },
    onError: (error) => {
      setIsProcessing(false);
      
      toast({
        title: "Booking failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Process payment and create booking
  const onSubmit = (values: z.infer<typeof paymentSchema>) => {
    if (!user || !event) return;
    
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      // Create booking
      createBookingMutation.mutate({
        userId: user.id,
        eventId: parseInt(eventId),
        seatIds: seatIds.join(','),
        totalPrice: totalPrice,
      });
    }, 2000);
  };

  // Make sure user is logged in and we have event/seats data
  if (!user || !event || seats.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-t-2 border-primary rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-center mb-8">Checkout</h1>

        {isSuccess ? (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <div className="w-20 h-20 rounded-full bg-green-100 mx-auto flex items-center justify-center">
                <CheckIcon className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-center mt-4">Booking Confirmed!</CardTitle>
              <CardDescription className="text-center">
                Your tickets for {event.title} have been booked successfully.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-t border-b border-slate-200 py-4">
                <p className="text-center text-slate-600">
                  A confirmation email has been sent to {user.email}
                </p>
              </div>
              <div className="text-center">
                <p className="text-slate-600">Redirecting to your dashboard...</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Link href="/dashboard">
                <Button>Go to My Tickets</Button>
              </Link>
            </CardFooter>
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Details</CardTitle>
                  <CardDescription>Complete your booking by entering your payment information</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="credit-card" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="credit-card">Credit Card</TabsTrigger>
                      <TabsTrigger value="paypal">PayPal</TabsTrigger>
                    </TabsList>
                    <TabsContent value="credit-card">
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="cardName">Name on Card</Label>
                          <Input 
                            id="cardName" 
                            placeholder="John Doe" 
                            {...form.register("cardName")} 
                          />
                          {form.formState.errors.cardName && (
                            <p className="text-sm text-red-500">{form.formState.errors.cardName.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="cardNumber">Card Number</Label>
                          <div className="relative">
                            <Input 
                              id="cardNumber" 
                              placeholder="1234 5678 9012 3456" 
                              {...form.register("cardNumber")} 
                            />
                            <CreditCard className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                          </div>
                          {form.formState.errors.cardNumber && (
                            <p className="text-sm text-red-500">{form.formState.errors.cardNumber.message}</p>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="expiryDate">Expiry Date</Label>
                            <Input 
                              id="expiryDate" 
                              placeholder="MM/YY" 
                              {...form.register("expiryDate")} 
                            />
                            {form.formState.errors.expiryDate && (
                              <p className="text-sm text-red-500">{form.formState.errors.expiryDate.message}</p>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="cvv">CVV</Label>
                            <Input 
                              id="cvv" 
                              placeholder="123" 
                              {...form.register("cvv")} 
                            />
                            {form.formState.errors.cvv && (
                              <p className="text-sm text-red-500">{form.formState.errors.cvv.message}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="pt-4">
                          <Button 
                            type="submit" 
                            className="w-full" 
                            disabled={isProcessing}
                          >
                            {isProcessing ? "Processing..." : `Pay $${totalPrice.toFixed(2)}`}
                          </Button>
                        </div>
                      </form>
                    </TabsContent>
                    <TabsContent value="paypal">
                      <div className="py-8 text-center">
                        <p className="text-slate-600 mb-4">You will be redirected to PayPal to complete your payment.</p>
                        <Button disabled={isProcessing}>Continue to PayPal</Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
                <CardFooter className="text-sm text-slate-500 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Your payment information is encrypted and secure
                </CardFooter>
              </Card>
            </div>
            
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{event.title}</h3>
                    <p className="text-sm text-slate-600">{format(new Date(event.date), "EEE, MMM d, yyyy 'at' h:mm a")}</p>
                    <p className="text-sm text-slate-600">{event.venue}, {event.location}</p>
                  </div>
                  
                  <div className="border-t border-b border-slate-200 py-4">
                    <h4 className="font-medium mb-2">Tickets ({seats.length})</h4>
                    {seats.map(seat => (
                      <div key={seat.id} className="flex justify-between text-sm mb-1">
                        <span>Section {seat.row}, Seat {seat.number}</span>
                        <span>${seat.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
              
              <div className="mt-4">
                <Link href={`/events/${eventId}`}>
                  <Button variant="outline" className="w-full">Back to Event</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
