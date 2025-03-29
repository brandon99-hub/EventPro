import { useState } from "react";
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
  Loader2
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
import { insertEventSchema, Event, Category, Booking, Seat, InsertEvent } from "@shared/schema";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Extend the event schema for the form
const eventFormSchema = insertEventSchema.extend({
  date: z.string(),
  endDate: z.string().optional(),
  categoryId: z.string().transform(val => parseInt(val)),
  price: z.string().transform(val => parseFloat(val)),
  maxPrice: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  totalSeats: z.string().transform(val => parseInt(val)),
  availableSeats: z.string().transform(val => parseInt(val)),
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
      location: "",
      venue: "",
      price: "",
      maxPrice: "",
      totalSeats: "",
      availableSeats: "",
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

  // Submit event form
  const onSubmit = (values: EventFormValues) => {
    if (!user) return;

    const eventData: InsertEvent = {
      ...values,
      createdBy: user.id,
      date: new Date(values.date),
      endDate: values.endDate ? new Date(values.endDate) : undefined
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

  // Filter events by search query
  const filteredEvents = events.filter(event => 
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.venue.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      {/* Sidebar */}
      <div className="w-64 bg-slate-800 text-white flex flex-col">
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
      <div className="flex-1 overflow-auto">
        <header className="bg-white shadow">
          <div className="py-4 px-6">
            <h1 className="text-2xl font-bold text-slate-900">
              {activeTab === "dashboard" && "Admin Dashboard"}
              {activeTab === "events" && "Manage Events"}
              {activeTab === "bookings" && "Manage Bookings"}
              {activeTab === "users" && "Manage Users"}
            </h1>
          </div>
        </header>

        <main className="p-6">
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
                                User ID: {booking.userId} • {booking.seatIds.split(',').length} tickets
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
              <div className="flex justify-between items-center mb-6">
                <div className="relative w-64">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input 
                    placeholder="Search events..." 
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="space-x-2">
                  <Button onClick={() => setIsAddEventDialogOpen(true)}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Event
                  </Button>
                </div>
              </div>
              
              <div className="bg-white rounded-md shadow">
                <div className="grid grid-cols-12 gap-2 p-4 font-medium text-slate-500 border-b">
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
                      <Button onClick={() => setIsAddEventDialogOpen(true)}>
                        Create Event
                      </Button>
                    </div>
                  ) : (
                    <div>
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
                                <h3 className="font-medium text-slate-900 truncate">{event.title}</h3>
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
                              ${event.price}
                              {event.maxPrice && ` - $${event.maxPrice}`}
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
                              <Link href={`/events/${event.id}`}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <PencilIcon className="h-4 w-4 text-slate-500" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Add Event Dialog */}
              <Dialog open={isAddEventDialogOpen} onOpenChange={setIsAddEventDialogOpen}>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Create New Event</DialogTitle>
                    <DialogDescription>
                      Fill in the details to create a new event on the platform
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Event Title*</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter event title" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="categoryId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category*</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value?.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {categories.map(category => (
                                    <SelectItem key={category.id} value={category.id.toString()}>
                                      {category.name}
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
                          name="imageUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Image URL*</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter image URL" {...field} />
                              </FormControl>
                              <FormDescription>
                                URL to the event's cover image
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Price ($)*</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" min="0" {...field} />
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
                                <FormLabel>Max Price ($)</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" min="0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Date & Time*</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Date & Time</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Location*</FormLabel>
                              <FormControl>
                                <Input placeholder="City, State" {...field} />
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
                              <FormLabel>Venue*</FormLabel>
                              <FormControl>
                                <Input placeholder="Venue name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="totalSeats"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Total Seats*</FormLabel>
                                <FormControl>
                                  <Input type="number" min="1" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="availableSeats"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Available Seats*</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
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
                                <FormLabel>Featured Event</FormLabel>
                                <FormDescription>
                                  Display this event in the featured section on homepage
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description*</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe the event in detail" 
                                className="min-h-32" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <DialogFooter>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsAddEventDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit"
                          disabled={createEventMutation.isPending}
                        >
                          {createEventMutation.isPending ? "Creating..." : "Create Event"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              {/* Delete Confirmation Dialog */}
              <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Confirm Deletion</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete this event? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsDeleteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={confirmDeleteEvent}
                      disabled={deleteEventMutation.isPending}
                    >
                      {deleteEventMutation.isPending ? "Deleting..." : "Delete Event"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
            
            <TabsContent value="bookings">
              <div className="bg-white rounded-md shadow">
                <div className="grid grid-cols-12 gap-2 p-4 font-medium text-slate-500 border-b">
                  <div className="col-span-1">ID</div>
                  <div className="col-span-3">Event</div>
                  <div className="col-span-2">User</div>
                  <div className="col-span-2">Date</div>
                  <div className="col-span-2">Amount</div>
                  <div className="col-span-2">Status</div>
                </div>
                
                <ScrollArea className="h-[calc(100vh-280px)]">
                  {bookings.length === 0 ? (
                    <div className="p-8 text-center">
                      <AlertTriangleIcon className="h-10 w-10 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-1">No bookings found</h3>
                      <p className="text-slate-500">
                        There are no bookings in the system yet
                      </p>
                    </div>
                  ) : (
                    <div>
                      {bookings.map(booking => {
                        const event = events.find(e => e.id === booking.eventId);
                        return (
                          <div 
                            key={booking.id} 
                            className="grid grid-cols-12 gap-2 p-4 items-center border-b border-slate-100 hover:bg-slate-50"
                          >
                            <div className="col-span-1 text-sm font-medium">#{booking.id}</div>
                            <div className="col-span-3">{event?.title || "Unknown Event"}</div>
                            <div className="col-span-2">User #{booking.userId}</div>
                            <div className="col-span-2 text-sm">
                              {format(new Date(booking.bookingDate), "MMM d, yyyy")}
                            </div>
                            <div className="col-span-2 font-medium">${booking.totalPrice.toFixed(2)}</div>
                            <div className="col-span-2">
                              <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                                booking.paymentStatus === "completed" 
                                  ? "bg-green-100 text-green-800" 
                                  : booking.paymentStatus === "pending" 
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-red-100 text-red-800"
                              }`}>
                                {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
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
          </Tabs>
        </main>
      </div>
    </div>
  );
}
