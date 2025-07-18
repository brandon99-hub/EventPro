import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  Calendar,
  Users,
  TicketIcon,
  HomeIcon,
  LogOut,
  ChevronDownIcon,
  XIcon,
  CheckIcon,
  AlertTriangleIcon,
  SearchIcon,
  Loader2,
  MenuIcon,
  CameraIcon
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { insertEventSchema, Event, Category, Booking, InsertEvent } from "@shared/schema";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DateRange } from "react-day-picker";
import { addDays, isAfter, isBefore, isSameDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { QRScanner } from "@/components/ui/qr-scanner";
import { useIsMobile } from "@/hooks/use-mobile";

// Extend the event schema for the form
const eventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  imageUrl: z.string().min(1, "Image is required").refine(
    val => val.startsWith("http") || val.startsWith("data:image/"),
    { message: "Must be a valid image URL or uploaded image." }
  ),
  date: z.string().min(1, "Date is required"),
  endDate: z.string().optional(),
  venue: z.string().min(1, "Venue is required"),
  price: z.string().min(1, "Price is required"),
  maxPrice: z.string().optional(),
  totalSeats: z.string().min(1, "Total seats is required"),
  availableSeats: z.string().min(1, "Available seats is required"),
  categoryId: z.string().min(1, "Category is required"),
  isFeatured: z.boolean().default(false)
});

type EventFormValues = z.infer<typeof eventFormSchema>;

export default function AdminPage() {
  const { user, logoutMutation } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("events");
  const [isAddEventDialogOpen, setIsAddEventDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [isEditEventDialogOpen, setIsEditEventDialogOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDateRange, setFilterDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Redirect if not an admin
  if (user && !user.isAdmin) {
    navigate("/");
    return null;
  }

  // Queries
  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  // Form setup
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      imageUrl: "",
      date: "",
      endDate: "",
      venue: "",
      price: "",
      maxPrice: "",
      totalSeats: "100",
      availableSeats: "100",
      categoryId: "",
      isFeatured: false
    },
  });

  // Mutations
  const createEventMutation = useMutation({
    mutationFn: async (data: InsertEvent) => {
      const res = await apiRequest("POST", "/api/events", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setIsAddEventDialogOpen(false);
      form.reset();
      toast({
        title: "Event created",
        description: "The event has been successfully created.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create event",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setIsDeleteDialogOpen(false);
      setSelectedEventId(null);
      toast({
        title: "Event deleted",
        description: "The event has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete event",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Edit event mutation
  const updateEventMutation = useMutation({
    mutationFn: async (data: InsertEvent & { id: number }) => {
      const res = await apiRequest("PUT", `/api/events/${data.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setIsEditEventDialogOpen(false);
      setEditEvent(null);
      toast({
        title: "Event updated",
        description: "The event has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update event",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Submit event form
  const onSubmit = (values: EventFormValues) => {
    if (!user) return;

    const eventData: InsertEvent = {
      title: values.title,
      description: values.description,
      imageUrl: values.imageUrl,
      location: "Daystar University", // Hardcoded location
      venue: values.venue,
      price: parseFloat(values.price),
      maxPrice: values.maxPrice ? parseFloat(values.maxPrice) : undefined,
      totalSeats: parseInt(values.totalSeats),
      availableSeats: parseInt(values.availableSeats),
      categoryId: parseInt(values.categoryId),
      createdBy: user.id,
      date: new Date(values.date).toISOString(),
      endDate: values.endDate ? new Date(values.endDate).toISOString() : undefined,
      isFeatured: values.isFeatured
    };

    createEventMutation.mutate(eventData);
  };

  // Handle event delete
  const handleDeleteEvent = (id: number) => {
    setSelectedEventId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteEvent = () => {
    if (selectedEventId !== null) {
      deleteEventMutation.mutate(selectedEventId);
    }
  };

  // Handle image selection
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        form.setValue("imageUrl", result);
      };
      reader.readAsDataURL(file);
    }
  };

  // When editEvent changes, update the form values
  useEffect(() => {
    if (editEvent) {
      form.reset({
        title: editEvent.title,
        description: editEvent.description,
        imageUrl: editEvent.imageUrl,
        date: editEvent.date ? new Date(editEvent.date).toISOString().slice(0, 16) : "",
        endDate: editEvent.endDate ? new Date(editEvent.endDate).toISOString().slice(0, 16) : "",
        venue: editEvent.venue,
        price: editEvent.price.toString(),
        maxPrice: editEvent.maxPrice ? editEvent.maxPrice.toString() : "",
        totalSeats: editEvent.totalSeats.toString(),
        availableSeats: editEvent.availableSeats.toString(),
        categoryId: editEvent.categoryId.toString(),
        isFeatured: editEvent.isFeatured,
      });
    }
  }, [editEvent]);

  // Advanced filtering logic
  const filteredEvents = events.filter(event => {
    // Search filter
    if (
      searchQuery &&
      !event.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !event.venue.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    // Category filter
    if (filterCategory !== "all" && event.categoryId.toString() !== filterCategory) {
      return false;
    }
    // Status filter
    const now = new Date();
    if (filterStatus === "upcoming" && !(new Date(event.date) > now)) {
      return false;
    }
    if (filterStatus === "past" && !(new Date(event.date) <= now)) {
      return false;
    }
    if (filterStatus === "soldout" && event.availableSeats > 0) {
      return false;
    }
    // Date range filter
    if (filterDateRange.from && isBefore(new Date(event.date), filterDateRange.from)) {
      return false;
    }
    if (filterDateRange.to && isAfter(new Date(event.date), addDays(filterDateRange.to, 1))) {
      return false;
    }
    return true;
  });

  // Loading state
  if (eventsLoading || categoriesLoading || bookingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Mobile Sidebar Drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetTrigger asChild>
          <button className="md:hidden p-3 focus:outline-none" onClick={() => setMobileNavOpen(true)}>
            <MenuIcon className="h-7 w-7 text-slate-800" />
            <span className="sr-only">Open admin navigation</span>
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="bg-slate-800 text-white h-full flex flex-col">
            <div className="p-4 flex items-center border-b border-slate-700">
              <Link href="/" onClick={() => setMobileNavOpen(false)}>
                <span className="text-xl font-bold cursor-pointer">EventHub</span>
              </Link>
              <span className="ml-2 bg-primary text-white text-xs rounded px-2 py-1">Admin</span>
            </div>
            <div className="flex-1 py-8 px-4">
              <nav className="space-y-2">
                <button 
                  className={`w-full flex items-center text-left py-2 px-4 rounded ${activeTab === "dashboard" ? "bg-slate-700" : "hover:bg-slate-700"}`}
                  onClick={() => { setActiveTab("dashboard"); setMobileNavOpen(false); }}
                >
                  <HomeIcon className="h-5 w-5 mr-3" />
                  Dashboard
                </button>
                <button 
                  className={`w-full flex items-center text-left py-2 px-4 rounded ${activeTab === "events" ? "bg-slate-700" : "hover:bg-slate-700"}`}
                  onClick={() => { setActiveTab("events"); setMobileNavOpen(false); }}
                >
                  <Calendar className="h-5 w-5 mr-3" />
                  Events
                </button>
                <button 
                  className={`w-full flex items-center text-left py-2 px-4 rounded ${activeTab === "bookings" ? "bg-slate-700" : "hover:bg-slate-700"}`}
                  onClick={() => { setActiveTab("bookings"); setMobileNavOpen(false); }}
                >
                  <TicketIcon className="h-5 w-5 mr-3" />
                  Bookings
                </button>
                <button 
                  className={`w-full flex items-center text-left py-2 px-4 rounded ${activeTab === "users" ? "bg-slate-700" : "hover:bg-slate-700"}`}
                  onClick={() => { setActiveTab("users"); setMobileNavOpen(false); }}
                >
                  <Users className="h-5 w-5 mr-3" />
                  Users
                </button>
                {isMobile && (
                  <button 
                    className={`w-full flex items-center text-left py-2 px-4 rounded ${activeTab === "qr-scanner" ? "bg-slate-700" : "hover:bg-slate-700"}`}
                    onClick={() => { setActiveTab("qr-scanner"); setMobileNavOpen(false); }}
                  >
                    <CameraIcon className="h-5 w-5 mr-3" />
                    QR Scanner
                  </button>
                )}
              </nav>
            </div>
            <div className="p-4 border-t border-slate-700">
              <div className="flex items-center">
                <img 
                  className="h-8 w-8 rounded-full"
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || '')}&background=random`}
                  alt={user?.fullName}
                />
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium truncate">{user?.fullName}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                </div>
                <button 
                  className="text-slate-400 hover:text-white"
                  onClick={() => { setMobileNavOpen(false); logoutMutation.mutate(); }}
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 bg-slate-800 text-white flex-col">
        <div className="p-4 flex items-center border-b border-slate-700">
          <Link href="/">
            <span className="text-xl font-bold cursor-pointer">EventHub</span>
          </Link>
          <span className="ml-2 bg-primary text-white text-xs rounded px-2 py-1">Admin</span>
        </div>
        <div className="flex-1 py-8 px-4">
          <nav className="space-y-2">
            <button 
              className={`w-full flex items-center text-left py-2 px-4 rounded ${activeTab === "dashboard" ? "bg-slate-700" : "hover:bg-slate-700"}`}
              onClick={() => setActiveTab("dashboard")}
            >
              <HomeIcon className="h-5 w-5 mr-3" />
              Dashboard
            </button>
            <button 
              className={`w-full flex items-center text-left py-2 px-4 rounded ${activeTab === "events" ? "bg-slate-700" : "hover:bg-slate-700"}`}
              onClick={() => setActiveTab("events")}
            >
              <Calendar className="h-5 w-5 mr-3" />
              Events
            </button>
            <button 
              className={`w-full flex items-center text-left py-2 px-4 rounded ${activeTab === "bookings" ? "bg-slate-700" : "hover:bg-slate-700"}`}
              onClick={() => setActiveTab("bookings")}
            >
              <TicketIcon className="h-5 w-5 mr-3" />
              Bookings
            </button>
            <button 
              className={`w-full flex items-center text-left py-2 px-4 rounded ${activeTab === "users" ? "bg-slate-700" : "hover:bg-slate-700"}`}
              onClick={() => setActiveTab("users")}
            >
              <Users className="h-5 w-5 mr-3" />
              Users
            </button>
            {isMobile && (
              <button 
                className={`w-full flex items-center text-left py-2 px-4 rounded ${activeTab === "qr-scanner" ? "bg-slate-700" : "hover:bg-slate-700"}`}
                onClick={() => setActiveTab("qr-scanner")}
              >
                <CameraIcon className="h-5 w-5 mr-3" />
                QR Scanner
              </button>
            )}
          </nav>
        </div>
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center">
            <img 
              className="h-8 w-8 rounded-full"
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || '')}&background=random`}
              alt={user?.fullName}
            />
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium truncate">{user?.fullName}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <button 
              className="text-slate-400 hover:text-white"
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="flex-1 overflow-auto w-full">
        <header className="bg-white shadow flex items-center px-2 sm:px-6">
          <div className="flex-1 py-4">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {activeTab === "dashboard" && "Admin Dashboard"}
              {activeTab === "events" && "Manage Events"}
              {activeTab === "bookings" && "Manage Bookings"}
              {activeTab === "users" && "Manage Users"}
              {activeTab === "qr-scanner" && "QR Code Scanner"}
            </h1>
          </div>
        </header>
        <main className="p-2 sm:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="dashboard">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="bg-primary/10 p-3 rounded-full">
                        <Calendar className="h-8 w-8 text-primary" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-slate-500">Total Events</p>
                        <h3 className="text-3xl font-bold">{events.length}</h3>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="bg-green-100 p-3 rounded-full">
                        <TicketIcon className="h-8 w-8 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-slate-500">Total Bookings</p>
                        <h3 className="text-3xl font-bold">{bookings.length}</h3>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="bg-purple-100 p-3 rounded-full">
                        <Users className="h-8 w-8 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-slate-500">Users</p>
                        <h3 className="text-3xl font-bold">{5}</h3> {/* Placeholder */}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="bg-amber-100 p-3 rounded-full">
                        <div className="h-8 w-8 text-amber-600 flex items-center justify-center font-bold text-xl">$</div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-slate-500">Revenue</p>
                        <h3 className="text-3xl font-bold">
                          ${bookings.reduce((sum, booking) => sum + booking.totalPrice, 0).toFixed(2)}
                        </h3>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Bookings</CardTitle>
                    <CardDescription>Latest event bookings on the platform</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-4">
                      {bookings.slice(0, 5).map(booking => {
                        const event = events.find(e => e.id === booking.eventId);
                        return (
                          <li key={booking.id} className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{event?.title || "Unknown Event"}</p>
                              <p className="text-sm text-slate-500">
                                {booking.buyerName} • {booking.ticketQuantity} tickets
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">${booking.totalPrice.toFixed(2)}</p>
                              <p className="text-sm text-slate-500">
                                {format(new Date(booking.bookingDate), "MMM d, yyyy")}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full" onClick={() => setActiveTab("bookings")}>
                      View All Bookings
                    </Button>
                  </CardFooter>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Upcoming Events</CardTitle>
                    <CardDescription>Events scheduled in the near future</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-4">
                      {events
                        .filter(e => new Date(e.date) > new Date())
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .slice(0, 5)
                        .map(event => {
                          const category = categories.find(c => c.id === event.categoryId);
                          return (
                            <li key={event.id} className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">{event.title}</p>
                                <p className="text-sm text-slate-500">
                                  {event.venue}, {event.location}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">
                                  <span 
                                    className="inline-block rounded-full px-2 py-0.5 text-xs text-white"
                                    style={{ backgroundColor: category?.color || "#6366F1" }}
                                  >
                                    {category?.name || "Event"}
                                  </span>
                                </p>
                                <p className="text-sm text-slate-500">
                                  {format(new Date(event.date), "MMM d, yyyy")}
                                </p>
                              </div>
                            </li>
                          );
                        })}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full" onClick={() => setActiveTab("events")}>
                      View All Events
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="events">
              {/* Mobile Responsive Filter Controls */}
              <div className="space-y-4 mb-6">
                {/* Search Bar - Full width on mobile */}
                <div className="relative w-full">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input 
                    placeholder="Search events..." 
                    className="pl-10 h-12"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                {/* Filter Controls - Grid layout for mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Category Filter */}
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id.toString()}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Status Filter */}
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="past">Past</SelectItem>
                      <SelectItem value="soldout">Sold Out</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Date Range Filter */}
                  <div className="flex flex-col gap-2">
                    <span className="text-sm text-slate-600">From:</span>
                    <Input
                      type="date"
                      value={filterDateRange.from ? filterDateRange.from.toISOString().slice(0, 10) : ""}
                      onChange={e => setFilterDateRange(r => ({ ...r, from: e.target.value ? new Date(e.target.value) : undefined }))}
                      className="h-12"
                      placeholder="From date"
                    />
                  </div>
                  
                  {/* To Date Filter */}
                  <div className="flex flex-col gap-2">
                    <span className="text-sm text-slate-600">To:</span>
                    <Input
                      type="date"
                      value={filterDateRange.to ? filterDateRange.to.toISOString().slice(0, 10) : ""}
                      onChange={e => setFilterDateRange(r => ({ ...r, to: e.target.value ? new Date(e.target.value) : undefined }))}
                      className="h-12"
                      placeholder="To date"
                    />
                  </div>
                </div>
                
                {/* Add Event Button */}
                <div className="flex justify-end">
                  <Button onClick={() => setIsAddEventDialogOpen(true)} className="h-12 px-6">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Event
                  </Button>
                </div>
              </div>
              
              {/* Events List - Responsive Layout */}
              <div className="bg-white rounded-md shadow">
                {/* Desktop Table Header */}
                <div className="hidden md:grid grid-cols-12 gap-2 p-4 font-medium text-slate-500 border-b">
                  <div className="col-span-5">Event Name</div>
                  <div className="col-span-2">Date</div>
                  <div className="col-span-2">Category</div>
                  <div className="col-span-1">Price</div>
                  <div className="col-span-1">Available</div>
                  <div className="col-span-1">Actions</div>
                </div>
                
                <ScrollArea className="h-[calc(100vh-320px)]">
                  {filteredEvents.length === 0 ? (
                    <div className="p-8 text-center">
                      <AlertTriangleIcon className="h-10 w-10 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-1">No events found</h3>
                      <p className="text-slate-500 mb-4">
                        {searchQuery ? "Try a different search term" : "You haven't created any events yet"}
                      </p>
                      <Button onClick={() => setIsAddEventDialogOpen(true)} className="h-12 px-6">
                        Create Event
                      </Button>
                    </div>
                  ) : (
                    <div>
                      {/* Mobile Card Layout */}
                      <div className="md:hidden space-y-4 p-4">
                        {filteredEvents.map(event => {
                          const category = categories.find(c => c.id === event.categoryId);
                          return (
                            <Card key={event.id} className="overflow-hidden">
                              <div className="flex items-start p-4">
                                <div className="w-16 h-16 rounded overflow-hidden mr-4 flex-shrink-0">
                                  <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-medium text-slate-900 truncate flex-1 mr-2">
                                      {event.title}
                                    </h3>
                                    <div className="flex space-x-1">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-10 w-10"
                                        onClick={() => handleDeleteEvent(event.id)}
                                      >
                                        <TrashIcon className="h-4 w-4 text-slate-500" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-10 w-10"
                                        onClick={() => {
                                          setEditEvent(event);
                                          setIsEditEventDialogOpen(true);
                                        }}
                                      >
                                        <PencilIcon className="h-4 w-4 text-slate-500" />
                                      </Button>
                                    </div>
                                  </div>
                                  <p className="text-sm text-slate-500 mb-2">{event.venue}, {event.location}</p>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-sm">
                                      {format(new Date(event.date), "MMM d, yyyy 'at' h:mm a")}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span 
                                      className="inline-block rounded-full px-2 py-0.5 text-xs text-white"
                                      style={{ backgroundColor: category?.color || "#6366F1" }}
                                    >
                                      {category?.name || "Unknown"}
                                    </span>
                                    {event.isFeatured && (
                                      <span className="bg-amber-100 text-amber-800 text-xs rounded px-1.5 py-0.5">
                                        Featured
                                      </span>
                                    )}
                                    {event.availableSeats === 0 && (
                                      <span className="bg-red-600 text-white text-xs rounded px-1.5 py-0.5">
                                        Sold Out
                                      </span>
                                    )}
                                    {new Date(event.date) < new Date() && (
                                      <span className="bg-slate-500 text-white text-xs rounded px-1.5 py-0.5">
                                        Past
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium">
                                      Ksh{event.price}
                                      {event.maxPrice && ` - Ksh${event.maxPrice}`}
                                    </span>
                                    <span className="text-slate-500">
                                      {event.availableSeats}/{event.totalSeats} available
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                      
                      {/* Desktop Table Layout */}
                      <div className="hidden md:block">
                      {filteredEvents.map(event => {
                        const category = categories.find(c => c.id === event.categoryId);
                        return (
                          <div 
                            key={event.id} 
                            className="grid grid-cols-12 gap-2 p-4 items-center border-b border-slate-100 hover:bg-slate-50"
                          >
                            <div className="col-span-5 flex items-center">
                              <div className="w-10 h-10 rounded overflow-hidden mr-3 flex-shrink-0">
                                <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <h3 className="font-medium text-slate-900 truncate flex items-center gap-2">
                                  {event.title}
                                  {/* Status Badges */}
                                  {event.availableSeats === 0 && (
                                    <Badge className="bg-red-600 text-white font-bold ml-2">Sold Out</Badge>
                                  )}
                                  {new Date(event.date) < new Date() && (
                                    <Badge className="bg-slate-500 text-white font-bold ml-2">Past</Badge>
                                  )}
                                </h3>
                                <p className="text-sm text-slate-500 truncate">{event.venue}, {event.location}</p>
                              </div>
                            </div>
                            <div className="col-span-2 text-sm">
                              {format(new Date(event.date), "MMM d, yyyy 'at' h:mm a")}
                            </div>
                            <div className="col-span-2">
                              <span 
                                className="inline-block rounded-full px-2 py-0.5 text-xs text-white"
                                style={{ backgroundColor: category?.color || "#6366F1" }}
                              >
                                {category?.name || "Unknown"}
                              </span>
                              {event.isFeatured && (
                                <span className="ml-2 bg-amber-100 text-amber-800 text-xs rounded px-1.5 py-0.5">
                                  Featured
                                </span>
                              )}
                            </div>
                            <div className="col-span-1 text-sm">
                              Ksh{event.price}
                              {event.maxPrice && ` - Ksh${event.maxPrice}`}
                            </div>
                            <div className="col-span-1 text-sm">
                              {event.availableSeats}/{event.totalSeats}
                            </div>
                            <div className="col-span-1 flex space-x-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleDeleteEvent(event.id)}
                              >
                                <TrashIcon className="h-4 w-4 text-slate-500" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditEvent(event);
                                  setIsEditEventDialogOpen(true);
                                }}
                              >
                                  <PencilIcon className="h-4 w-4 text-slate-500" />
                                </Button>
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Add Event Dialog */}
              <Dialog open={isAddEventDialogOpen} onOpenChange={setIsAddEventDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] max-w-[95vw] md:w-auto">
                  <DialogHeader className="pb-6">
                    <DialogTitle className="text-xl sm:text-2xl font-bold">Create New Event</DialogTitle>
                    <DialogDescription className="text-slate-600">
                      Fill in the details to create a new event on the platform
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                        {/* Left Column */}
                        <div className="space-y-6">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-base font-semibold">Event Title*</FormLabel>
                              <FormControl>
                                  <Input 
                                    placeholder="Enter event title" 
                                    className="h-12 text-base"
                                    {...field} 
                                  />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                            name="imageUrl"
                          render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-base font-semibold">Event Image*</FormLabel>
                                <FormControl>
                                  <div className="space-y-4">
                                    <Input 
                                      type="file" 
                                      accept="image/*"
                                      onChange={handleImageSelect}
                                      className="h-12 text-base cursor-pointer"
                                    />
                                    {imagePreview && (
                                      <div className="relative">
                                        <img 
                                          src={imagePreview} 
                                          alt="Preview" 
                                          className="w-full h-48 object-cover rounded-lg border border-slate-200"
                                        />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setSelectedImage(null);
                                            setImagePreview("");
                                            form.setValue("imageUrl", "");
                                          }}
                                          className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                                        >
                                          Remove
                                        </Button>
                                      </div>
                                    )}
                                    <Input 
                                      {...field}
                                      placeholder="Or enter image URL directly" 
                                      className="h-12 text-base"
                                      onChange={(e) => {
                                        field.onChange(e.target.value);
                                        if (e.target.value && !e.target.value.startsWith('data:')) {
                                          setSelectedImage(null);
                                          setImagePreview("");
                                        }
                                      }}
                                    />
                                  </div>
                                </FormControl>
                                <FormDescription className="text-sm text-slate-500">
                                  Upload an image from your computer or provide an image URL
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-semibold">Start Date & Time*</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="datetime-local" 
                                    className="h-12 text-base"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="venue"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-semibold">Venue*</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Venue name" 
                                    className="h-12 text-base"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="totalSeats"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-semibold">Tickets Available*</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="1" 
                                    className="h-12 text-base"
                                    {...field}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      field.onChange(value);
                                      // Also update availableSeats to match
                                      form.setValue("availableSeats", value);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-semibold">Description*</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Describe the event in detail" 
                                    className="min-h-32 text-base resize-none"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        {/* Right Column */}
                        <div className="space-y-6">
                          <FormField
                            control={form.control}
                            name="categoryId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-semibold">Category*</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-12 text-base">
                                    <SelectValue placeholder="Select a category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {categories.map(category => (
                                    <SelectItem key={category.id} value={category.id.toString()}>
                                        <div className="flex items-center gap-2">
                                          <div 
                                            className="w-3 h-3 rounded-full" 
                                            style={{ backgroundColor: category.color }}
                                          />
                                      {category.name}
                                        </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                            name="price"
                          render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-base font-semibold">Price (Ksh)*</FormLabel>
                              <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    step="0.01" 
                                    placeholder="0.00"
                                    className="h-12 text-base"
                                    {...field} 
                                  />
                              </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="maxPrice"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-semibold">Max Price (Ksh)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    step="0.01" 
                                    placeholder="0.00"
                                    className="h-12 text-base"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormDescription className="text-sm text-slate-500">
                                  Leave empty if there's only one price tier
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                          <FormField
                            control={form.control}
                            name="endDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-semibold">End Date & Time</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="datetime-local" 
                                    className="h-12 text-base"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormDescription className="text-sm text-slate-500">
                                  Optional end time for the event
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="availableSeats"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-semibold">Available Tickets*</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="1" 
                                    className="h-12 text-base"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription className="text-sm text-slate-500">
                                  Number of tickets currently available for purchase
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="isFeatured"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-base font-semibold">
                                    Featured Event
                                  </FormLabel>
                                  <FormDescription className="text-sm text-slate-500">
                                    Display this event in the featured section on homepage
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                        </div>
                        
                                            <DialogFooter className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row gap-3 sm:gap-0">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsAddEventDialogOpen(false)}
                          className="px-6 py-3 w-full sm:w-auto"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createEventMutation.isPending}
                          className="px-6 py-3 w-full sm:w-auto"
                        >
                          {createEventMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            "Create Event"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              {/* Edit Event Dialog */}
              <Dialog open={isEditEventDialogOpen} onOpenChange={setIsEditEventDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] max-w-[95vw] md:w-auto">
                  <DialogHeader className="pb-6">
                    <DialogTitle className="text-xl sm:text-2xl font-bold">Edit Event</DialogTitle>
                    <DialogDescription className="text-slate-600">
                      Update the details for this event
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit((values) => {
                      if (!editEvent) return;
                      const eventData: InsertEvent & { id: number } = {
                        ...values,
                        id: editEvent.id,
                        location: "Daystar University",
                        venue: values.venue,
                        price: parseFloat(values.price),
                        maxPrice: values.maxPrice ? parseFloat(values.maxPrice) : undefined,
                        totalSeats: parseInt(values.totalSeats),
                        availableSeats: parseInt(values.availableSeats),
                        categoryId: parseInt(values.categoryId),
                        createdBy: editEvent.createdBy,
                        date: new Date(values.date).toISOString(),
                        endDate: values.endDate ? new Date(values.endDate).toISOString() : undefined,
                        isFeatured: values.isFeatured,
                        imageUrl: values.imageUrl,
                        description: values.description,
                        title: values.title,
                      };
                      updateEventMutation.mutate(eventData);
                    })} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left Column */}
                        <div className="space-y-6">
                        <FormField
                          control={form.control}
                            name="title"
                          render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-base font-semibold">Event Title*</FormLabel>
                              <FormControl>
                                  <Input 
                                    placeholder="Enter event title" 
                                    className="h-12 text-base"
                                    {...field} 
                                  />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                            name="imageUrl"
                          render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-base font-semibold">Event Image*</FormLabel>
                              <FormControl>
                                  <div className="space-y-4">
                                    <Input 
                                      type="file" 
                                      accept="image/*"
                                      onChange={handleImageSelect}
                                      className="h-12 text-base cursor-pointer"
                                    />
                                    {imagePreview && (
                                      <div className="relative">
                                        <img 
                                          src={imagePreview} 
                                          alt="Preview" 
                                          className="w-full h-48 object-cover rounded-lg border border-slate-200"
                                        />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setSelectedImage(null);
                                            setImagePreview("");
                                            form.setValue("imageUrl", "");
                                          }}
                                          className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                                        >
                                          Remove
                                        </Button>
                                      </div>
                                    )}
                                    <Input 
                                      {...field}
                                      placeholder="Or enter image URL directly" 
                                      className="h-12 text-base"
                                      onChange={(e) => {
                                        field.onChange(e.target.value);
                                        if (e.target.value && !e.target.value.startsWith('data:')) {
                                          setSelectedImage(null);
                                          setImagePreview("");
                                        }
                                      }}
                                    />
                                  </div>
                              </FormControl>
                                <FormDescription className="text-sm text-slate-500">
                                  Upload an image from your computer or provide an image URL
                                </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                            name="date"
                          render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-base font-semibold">Start Date & Time*</FormLabel>
                              <FormControl>
                                  <Input 
                                    type="datetime-local" 
                                    className="h-12 text-base"
                                    {...field} 
                                  />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="venue"
                          render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-base font-semibold">Venue*</FormLabel>
                              <FormControl>
                                  <Input 
                                    placeholder="Venue name" 
                                    className="h-12 text-base"
                                    {...field} 
                                  />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                          <FormField
                            control={form.control}
                            name="totalSeats"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-semibold">Tickets Available*</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="1" 
                                    className="h-12 text-base"
                                    {...field}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      field.onChange(value);
                                      // Also update availableSeats to match
                                      form.setValue("availableSeats", value);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-semibold">Description*</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Describe the event in detail" 
                                    className="min-h-32 text-base resize-none"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        {/* Right Column */}
                        <div className="space-y-6">
                        <FormField
                          control={form.control}
                            name="categoryId"
                          render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-semibold">Category*</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                    <SelectTrigger className="h-12 text-base">
                                      <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {categories.map(category => (
                                      <SelectItem key={category.id} value={category.id.toString()}>
                                        <div className="flex items-center gap-2">
                                          <div 
                                            className="w-3 h-3 rounded-full" 
                                            style={{ backgroundColor: category.color }}
                                          />
                                          {category.name}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-semibold">Price (Ksh)*</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    step="0.01" 
                                    placeholder="0.00"
                                    className="h-12 text-base"
                                    {...field} 
                                />
                              </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="maxPrice"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-semibold">Max Price (Ksh)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    step="0.01" 
                                    placeholder="0.00"
                                    className="h-12 text-base"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormDescription className="text-sm text-slate-500">
                                  Leave empty if there's only one price tier
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                          )}
                        />
                      
                      <FormField
                        control={form.control}
                            name="endDate"
                        render={({ field }) => (
                          <FormItem>
                                <FormLabel className="text-base font-semibold">End Date & Time</FormLabel>
                            <FormControl>
                                  <Input 
                                    type="datetime-local" 
                                    className="h-12 text-base"
                                {...field} 
                              />
                            </FormControl>
                                <FormDescription className="text-sm text-slate-500">
                                  Optional end time for the event
                                </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                          <FormField
                            control={form.control}
                            name="availableSeats"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-semibold">Available Tickets*</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="1" 
                                    className="h-12 text-base"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription className="text-sm text-slate-500">
                                  Number of tickets currently available for purchase
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="isFeatured"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-base font-semibold">
                                    Featured Event
                                  </FormLabel>
                                  <FormDescription className="text-sm text-slate-500">
                                    Display this event in the featured section on homepage
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <DialogFooter className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row gap-3 sm:gap-0">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsEditEventDialogOpen(false)}
                          className="px-6 py-3 w-full sm:w-auto"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit"
                          disabled={updateEventMutation.isPending}
                          className="px-6 py-3 w-full sm:w-auto"
                        >
                          {updateEventMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            "Update Event"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              {/* Delete Confirmation Dialog */}
              <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="max-w-md w-[95vw] max-w-[95vw] md:w-auto">
                  <DialogHeader>
                    <DialogTitle>Confirm Deletion</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete this event? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:gap-0">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsDeleteDialogOpen(false)}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={confirmDeleteEvent}
                      disabled={deleteEventMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      {deleteEventMutation.isPending ? "Deleting..." : "Delete Event"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
            
            <TabsContent value="bookings">
              <Card>
                <CardHeader>
                  <CardTitle>All Bookings</CardTitle>
                  <CardDescription>View all ticket purchases and attendee details.</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Booking Ref</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Event</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Buyer Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Buyer Email</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Tickets</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Total Price</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Payment Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Attendance</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">QR Code</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Booking Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                  {bookings.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="text-center py-8 text-slate-400">No bookings found.</td>
                          </tr>
                  ) : (
                          bookings.map(booking => {
                        const event = events.find(e => e.id === booking.eventId);
                        return (
                              <tr key={booking.id}>
                                <td className="px-4 py-2 text-sm text-slate-700">{booking.id}</td>
                                <td className="px-4 py-2 text-sm text-slate-700">{event ? event.title : 'Event not found'}</td>
                                <td className="px-4 py-2 text-sm text-slate-700">{booking.buyerName}</td>
                                <td className="px-4 py-2 text-sm text-slate-700">{booking.buyerEmail}</td>
                                <td className="px-4 py-2 text-sm text-slate-700">{booking.ticketQuantity}</td>
                                <td className="px-4 py-2 text-sm text-slate-700">${booking.totalPrice.toFixed(2)}</td>
                                <td className="px-4 py-2 text-sm text-slate-700">
                                  <Badge variant={booking.paymentStatus === 'completed' ? 'default' : 'secondary'}>
                                    {booking.paymentStatus}
                                  </Badge>
                                </td>
                                <td className="px-4 py-2 text-sm text-slate-700">
                                  <Badge variant={booking.paymentStatus === 'completed' ? 'default' : 'secondary'}>
                                    {booking.paymentStatus}
                                  </Badge>
                                </td>
                                <td className="px-4 py-2 text-sm text-slate-700">
                                  <span className="text-slate-400">See Tickets</span>
                                </td>
                                <td className="px-4 py-2 text-sm text-slate-700">{format(new Date(booking.bookingDate), 'yyyy-MM-dd HH:mm')}</td>
                              </tr>
                        );
                          })
                        )}
                      </tbody>
                    </table>
              </div>
                  
                  {/* Mobile Card Layout */}
                  <div className="md:hidden space-y-4">
                    {bookings.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">No bookings found.</div>
                    ) : (
                      bookings.map(booking => {
                        const event = events.find(e => e.id === booking.eventId);
                        return (
                          <Card key={booking.id} className="overflow-hidden">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-slate-500">Booking #{booking.id}</span>
                                  <span className="text-sm font-bold text-slate-900">${booking.totalPrice.toFixed(2)}</span>
                                </div>
                                <div>
                                  <h3 className="font-medium text-slate-900 mb-1">
                                    {event ? event.title : 'Event not found'}
                                  </h3>
                                  <p className="text-sm text-slate-500">{booking.buyerName}</p>
                                  <p className="text-sm text-slate-500">{booking.buyerEmail}</p>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-slate-600">
                                    {booking.ticketQuantity} ticket{booking.ticketQuantity !== 1 ? 's' : ''}
                                  </span>
                                  <span className="text-slate-500">
                                    {format(new Date(booking.bookingDate), 'MMM d, yyyy')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant={booking.paymentStatus === 'completed' ? 'default' : 'secondary'}>
                                    {booking.paymentStatus}
                                  </Badge>
                                </div>
                                <div className="mt-2">
                                  <p className="text-xs text-slate-500">Tickets: {booking.ticketQuantity}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="users">
              <div className="p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">User Management</h3>
                <p className="text-slate-500 max-w-md mx-auto mb-6">
                  This feature allows you to manage user accounts. View, edit, and manage permissions for all users on the platform.
                </p>
                <Button>View User Management</Button>
              </div>
            </TabsContent>
            
            <TabsContent value="qr-scanner">
              {!isMobile ? (
                <div className="p-8 text-center">
                  <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <CameraIcon className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">QR Code Scanner</h3>
                  <p className="text-slate-500 max-w-md mx-auto mb-6">
                    The QR code scanner is only available on mobile devices. Please use your phone to scan ticket QR codes.
                  </p>
                  <div className="text-sm text-slate-400 space-y-1">
                    <p>• Open this admin panel on your mobile device</p>
                    <p>• Navigate to the QR Scanner tab</p>
                    <p>• Allow camera permissions when prompted</p>
                    <p>• Point camera at ticket QR codes</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 p-4">
                  <div className="text-center">
                    <h3 className="text-xl font-medium mb-2">Scan Ticket QR Codes</h3>
                    <p className="text-slate-500">
                      Use your camera to scan QR codes from tickets to mark attendance
                    </p>
                  </div>
                  
                  <div className="max-w-md mx-auto">
                    <QRScanner
                      onScan={async (result) => {
                        setScannedResult(result);
                        try {
                          const response = await apiRequest("POST", "/api/qr-scan", { qrCode: result });
                          const data = await response.json();
                          
                          if (response.ok) {
                            toast({
                              title: "Attendance Marked!",
                              description: `${data.ticket.buyerName} - Ticket ${data.ticket.ticketNumber} - ${data.ticket.eventTitle}`,
                            });
                          } else {
                            toast({
                              title: "Scan Error",
                              description: data.message,
                              variant: "destructive",
                            });
                          }
                        } catch (error) {
                          toast({
                            title: "Scan Failed",
                            description: "Failed to process QR code",
                            variant: "destructive",
                          });
                        }
                      }}
                      onError={(error) => {
                        console.error('QR scan error:', error);
                        toast({
                          title: "Scanner Error",
                          description: error,
                          variant: "destructive",
                        });
                      }}
                      isScanning={isScanning}
                      onToggleScanning={() => setIsScanning(!isScanning)}
                    />
                  </div>
                  
                  {scannedResult && (
                    <Card className="max-w-md mx-auto">
                      <CardHeader>
                        <CardTitle>Last Scanned Result</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm font-mono bg-slate-100 p-3 rounded break-all">
                          {scannedResult}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
