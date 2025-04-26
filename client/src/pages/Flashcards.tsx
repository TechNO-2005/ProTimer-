import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FlashcardDeck, Flashcard } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Plus, 
  Trash2, 
  BookOpen, 
  Calendar, 
  RotateCw,
  Lightbulb,
  BrainCircuit
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Schema for deck creation/editing
const deckSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Deck name is required"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
});

// Schema for flashcard creation/editing
const flashcardSchema = z.object({
  id: z.number().optional(),
  deckId: z.number(),
  front: z.string().min(1, "Front content is required"),
  back: z.string().min(1, "Back content is required"),
});

type DeckFormValues = z.infer<typeof deckSchema>;
type FlashcardFormValues = z.infer<typeof flashcardSchema>;

const Flashcards = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isStudySessionOpen, setIsStudySessionOpen] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
  const [selectedCard, setSelectedCard] = useState<Flashcard | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  
  const isGuestMode = localStorage.getItem("guestMode") === "true";
  
  // Form for deck creation/editing
  const deckForm = useForm<DeckFormValues>({
    resolver: zodResolver(deckSchema),
    defaultValues: {
      name: "",
      description: "",
      dueDate: "",
    },
  });
  
  // Form for flashcard creation/editing
  const cardForm = useForm<FlashcardFormValues>({
    resolver: zodResolver(flashcardSchema),
    defaultValues: {
      deckId: 0,
      front: "",
      back: "",
    },
  });
  
  // Reset deck form
  const resetDeckForm = () => {
    deckForm.reset({
      id: selectedDeck?.id,
      name: selectedDeck?.name || "",
      description: selectedDeck?.description || "",
      dueDate: selectedDeck?.dueDate || "",
    });
  };
  
  // Reset card form
  const resetCardForm = () => {
    cardForm.reset({
      id: selectedCard?.id,
      deckId: selectedDeck?.id || 0,
      front: selectedCard?.front || "",
      back: selectedCard?.back || "",
    });
  };
  
  // Fetch flashcard decks
  const { data: decks = [], refetch: refetchDecks } = useQuery({
    queryKey: ["/api/flashcard-decks"],
    queryFn: async () => {
      if (isGuestMode) {
        // For guest mode, use mock data
        return [];
      } else {
        const response = await fetch("/api/flashcard-decks", {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch flashcard decks");
        return response.json();
      }
    },
  });
  
  // Fetch flashcards for selected deck
  const { data: flashcards = [], refetch: refetchCards } = useQuery({
    queryKey: ["/api/flashcard-decks", selectedDeck?.id, "flashcards"],
    queryFn: async () => {
      if (!selectedDeck) return [];
      
      if (isGuestMode) {
        // For guest mode, use mock data
        return [];
      } else {
        const response = await fetch(`/api/flashcard-decks/${selectedDeck.id}/flashcards`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch flashcards");
        return response.json();
      }
    },
    enabled: !!selectedDeck,
  });
  
  const handleAddDeck = () => {
    setSelectedDeck(null);
    deckForm.reset({
      name: "",
      description: "",
      dueDate: "",
    });
    setIsDeckModalOpen(true);
  };
  
  const handleEditDeck = (deck: FlashcardDeck) => {
    setSelectedDeck(deck);
    deckForm.reset({
      id: deck.id,
      name: deck.name,
      description: deck.description || "",
      dueDate: deck.dueDate || "",
    });
    setIsDeckModalOpen(true);
  };
  
  const handleDeleteDeck = async () => {
    if (!selectedDeck) return;
    
    setIsDeleting(true);
    
    try {
      if (isGuestMode) {
        toast({
          title: "Not available in guest mode",
          description: "This feature is not available in guest mode.",
        });
      } else {
        await apiRequest("DELETE", `/api/flashcard-decks/${selectedDeck.id}`);
        queryClient.invalidateQueries({ queryKey: ["/api/flashcard-decks"] });
        toast({
          title: "Deck deleted",
          description: "Your flashcard deck has been deleted successfully",
        });
        setIsDeckModalOpen(false);
        setSelectedDeck(null);
      }
    } catch (error) {
      toast({
        title: "Failed to delete deck",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  const onSubmitDeck = async (values: DeckFormValues) => {
    try {
      if (isGuestMode) {
        toast({
          title: "Not available in guest mode",
          description: "This feature is not available in guest mode.",
        });
      } else {
        if (selectedDeck?.id) {
          // Update existing deck
          await apiRequest("PUT", `/api/flashcard-decks/${selectedDeck.id}`, values);
          toast({
            title: "Deck updated",
            description: "Your flashcard deck has been updated successfully",
          });
        } else {
          // Create new deck
          const response = await apiRequest("POST", "/api/flashcard-decks", values);
          const newDeck = await response.json();
          setSelectedDeck(newDeck);
          toast({
            title: "Deck created",
            description: "Your new flashcard deck has been created successfully",
          });
        }
        
        queryClient.invalidateQueries({ queryKey: ["/api/flashcard-decks"] });
        setIsDeckModalOpen(false);
      }
    } catch (error) {
      toast({
        title: "Failed to save deck",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };
  
  const handleAddCard = () => {
    if (!selectedDeck) return;
    
    setSelectedCard(null);
    cardForm.reset({
      deckId: selectedDeck.id,
      front: "",
      back: "",
    });
    setIsCardModalOpen(true);
  };
  
  const handleEditCard = (card: Flashcard) => {
    setSelectedCard(card);
    cardForm.reset({
      id: card.id,
      deckId: card.deckId,
      front: card.front,
      back: card.back,
    });
    setIsCardModalOpen(true);
  };
  
  const handleDeleteCard = async () => {
    if (!selectedCard) return;
    
    setIsDeleting(true);
    
    try {
      if (isGuestMode) {
        toast({
          title: "Not available in guest mode",
          description: "This feature is not available in guest mode.",
        });
      } else {
        await apiRequest("DELETE", `/api/flashcards/${selectedCard.id}`);
        queryClient.invalidateQueries({ 
          queryKey: ["/api/flashcard-decks", selectedDeck?.id, "flashcards"] 
        });
        toast({
          title: "Flashcard deleted",
          description: "Your flashcard has been deleted successfully",
        });
        setIsCardModalOpen(false);
      }
    } catch (error) {
      toast({
        title: "Failed to delete flashcard",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  const onSubmitCard = async (values: FlashcardFormValues) => {
    try {
      if (isGuestMode) {
        toast({
          title: "Not available in guest mode",
          description: "This feature is not available in guest mode.",
        });
      } else {
        if (selectedCard?.id) {
          // Update existing card
          await apiRequest("PUT", `/api/flashcards/${selectedCard.id}`, values);
          toast({
            title: "Flashcard updated",
            description: "Your flashcard has been updated successfully",
          });
        } else {
          // Create new card
          await apiRequest("POST", `/api/flashcard-decks/${selectedDeck!.id}/flashcards`, values);
          toast({
            title: "Flashcard created",
            description: "Your new flashcard has been created successfully",
          });
        }
        
        queryClient.invalidateQueries({ 
          queryKey: ["/api/flashcard-decks", selectedDeck?.id, "flashcards"] 
        });
        setIsCardModalOpen(false);
      }
    } catch (error) {
      toast({
        title: "Failed to save flashcard",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };
  
  const startStudySession = () => {
    if (flashcards.length === 0) {
      toast({
        title: "No flashcards",
        description: "This deck has no flashcards to study.",
      });
      return;
    }
    
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setIsStudySessionOpen(true);
  };
  
  const nextCard = () => {
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      // End of deck
      toast({
        title: "Review completed",
        description: `You've completed reviewing ${flashcards.length} cards`,
      });
      setIsStudySessionOpen(false);
    }
  };
  
  const previousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  };

  return (
    <div className="flex min-h-screen relative">
      <Sidebar visible={sidebarVisible} onToggle={() => setSidebarVisible(!sidebarVisible)} />

      <main className={`flex-1 transition-all duration-300 ${sidebarVisible ? 'md:ml-[280px]' : ''} px-4 py-6 md:px-8 md:py-8`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Flashcards</h1>
            <p className="text-gray-400">Boost your learning with spaced repetition</p>
          </div>
          <div className="mt-4 md:mt-0">
            <Button 
              className="bg-[#388282] hover:bg-[#275050] text-white"
              onClick={handleAddDeck}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Deck
            </Button>
          </div>
        </div>

        {selectedDeck ? (
          // Selected deck view with its flashcards
          <>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <Button 
                  variant="outline" 
                  className="mr-4 border-gray-700"
                  onClick={() => setSelectedDeck(null)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                    className="mr-2">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                  Back to Decks
                </Button>
                <div>
                  <h2 className="text-xl font-semibold">{selectedDeck.name}</h2>
                  <p className="text-gray-400 text-sm">{flashcards.length} cards</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline" 
                  className="border-gray-700"
                  onClick={() => handleEditDeck(selectedDeck)}
                >
                  Edit Deck
                </Button>
                <Button 
                  className="bg-[#388282] hover:bg-[#275050] text-white"
                  onClick={startStudySession}
                  disabled={flashcards.length === 0}
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  Study Now
                </Button>
              </div>
            </div>
            
            {selectedDeck.description && (
              <div className="bg-gray-800 p-4 rounded-lg mb-6">
                <p className="text-gray-300">{selectedDeck.description}</p>
              </div>
            )}
            
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Flashcards</h3>
              <Button 
                variant="outline" 
                className="border-gray-700"
                onClick={handleAddCard}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Card
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {flashcards.length > 0 ? (
                flashcards.map((card) => (
                  <Card 
                    key={card.id} 
                    className="bg-gray-800 border-gray-700 cursor-pointer hover:bg-gray-750"
                    onClick={() => handleEditCard(card)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-md text-gray-300">Front</CardTitle>
                    </CardHeader>
                    <CardContent className="h-24 overflow-y-auto">
                      <p>{card.front}</p>
                    </CardContent>
                    <CardFooter className="border-t border-gray-700 pt-3 text-sm text-gray-400">
                      Click to edit
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="col-span-full bg-gray-800 rounded-lg p-10 text-center">
                  <div className="flex justify-center mb-4">
                    <BrainCircuit className="h-16 w-16 text-gray-600" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-300 mb-2">No flashcards yet</h3>
                  <p className="text-gray-400 mb-6">
                    Start creating flashcards to build your knowledge
                  </p>
                  <Button 
                    className="bg-[#388282] hover:bg-[#275050] text-white"
                    onClick={handleAddCard}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Flashcard
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          // Decks overview
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {decks.length > 0 ? (
              decks.map((deck) => (
                <Card 
                  key={deck.id} 
                  className="bg-gray-900 border-gray-800 hover:bg-gray-850 cursor-pointer"
                  onClick={() => setSelectedDeck(deck)}
                >
                  <CardHeader>
                    <CardTitle>{deck.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 line-clamp-2">
                      {deck.description || "No description"}
                    </p>
                  </CardContent>
                  <CardFooter className="flex justify-between border-t border-gray-800 pt-4">
                    <div className="flex items-center text-sm text-gray-400">
                      <BookOpen className="h-4 w-4 mr-1" />
                      <span>0 cards</span>
                    </div>
                    {deck.dueDate && (
                      <div className="flex items-center text-sm text-gray-400">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>Due {deck.dueDate}</span>
                      </div>
                    )}
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full bg-gray-800 rounded-lg p-10 text-center">
                <div className="flex justify-center mb-4">
                  <BookOpen className="h-16 w-16 text-gray-600" />
                </div>
                <h3 className="text-xl font-medium text-gray-300 mb-2">No flashcard decks yet</h3>
                <p className="text-gray-400 mb-6">
                  Create your first deck to start learning with flashcards
                </p>
                <Button 
                  className="bg-[#388282] hover:bg-[#275050] text-white"
                  onClick={handleAddDeck}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Deck
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Deck Form Modal */}
      <Dialog open={isDeckModalOpen} onOpenChange={(open) => {
        setIsDeckModalOpen(open);
        if (open) resetDeckForm();
      }}>
        <DialogContent className="bg-gray-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedDeck ? "Edit Deck" : "Create New Deck"}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedDeck 
                ? "Update your flashcard deck's details below"
                : "Create a new deck to organize your flashcards"
              }
            </DialogDescription>
          </DialogHeader>
          
          <Form {...deckForm}>
            <form onSubmit={deckForm.handleSubmit(onSubmitDeck)} className="space-y-6">
              <FormField
                control={deckForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deck Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., JavaScript Fundamentals" 
                        {...field} 
                        className="bg-gray-800 border-gray-700 focus:ring-[#388282]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={deckForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description of what this deck covers"
                        {...field} 
                        className="bg-gray-800 border-gray-700 focus:ring-[#388282] resize-none"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={deckForm.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        {...field} 
                        className="bg-gray-800 border-gray-700 focus:ring-[#388282]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="flex sm:justify-between gap-2">
                {selectedDeck && (
                  <Button 
                    type="button" 
                    variant="destructive"
                    onClick={handleDeleteDeck}
                    disabled={isDeleting}
                    className="mr-auto"
                  >
                    {isDeleting ? "Deleting..." : "Delete Deck"}
                    <Trash2 className="ml-2 h-4 w-4" />
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button type="button" variant="secondary" onClick={() => setIsDeckModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-[#388282] hover:bg-[#275050]">
                    {selectedDeck ? "Save Changes" : "Create Deck"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Flashcard Form Modal */}
      <Dialog open={isCardModalOpen} onOpenChange={(open) => {
        setIsCardModalOpen(open);
        if (open) resetCardForm();
      }}>
        <DialogContent className="bg-gray-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedCard ? "Edit Flashcard" : "Create New Flashcard"}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedCard 
                ? "Update your flashcard's content below"
                : "Add a new flashcard to your deck"
              }
            </DialogDescription>
          </DialogHeader>
          
          <Form {...cardForm}>
            <form onSubmit={cardForm.handleSubmit(onSubmitCard)} className="space-y-6">
              <FormField
                control={cardForm.control}
                name="front"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Front (Question)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="What appears on the front of the card?"
                        {...field} 
                        className="bg-gray-800 border-gray-700 focus:ring-[#388282] resize-none"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={cardForm.control}
                name="back"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Back (Answer)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="What appears on the back of the card?"
                        {...field} 
                        className="bg-gray-800 border-gray-700 focus:ring-[#388282] resize-none"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="flex sm:justify-between gap-2">
                {selectedCard && (
                  <Button 
                    type="button" 
                    variant="destructive"
                    onClick={handleDeleteCard}
                    disabled={isDeleting}
                    className="mr-auto"
                  >
                    {isDeleting ? "Deleting..." : "Delete Card"}
                    <Trash2 className="ml-2 h-4 w-4" />
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button type="button" variant="secondary" onClick={() => setIsCardModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-[#388282] hover:bg-[#275050]">
                    {selectedCard ? "Save Changes" : "Add Card"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Study Session Modal */}
      <Dialog open={isStudySessionOpen} onOpenChange={setIsStudySessionOpen}>
        <DialogContent className="bg-gray-900 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Study Session: {selectedDeck?.name}</DialogTitle>
            <DialogDescription className="text-gray-400">
              Card {currentCardIndex + 1} of {flashcards.length}
            </DialogDescription>
          </DialogHeader>
          
          {flashcards.length > 0 && (
            <div 
              className="min-h-[200px] bg-gray-800 rounded-lg p-6 cursor-pointer flex items-center justify-center"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-2">
                  {isFlipped ? "Answer" : "Question"}
                </p>
                <p className="text-lg">
                  {isFlipped ? flashcards[currentCardIndex].back : flashcards[currentCardIndex].front}
                </p>
                <p className="text-sm text-gray-400 mt-4">
                  Click to flip card
                </p>
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <Button 
              variant="outline" 
              className="border-gray-700"
              onClick={previousCard}
              disabled={currentCardIndex === 0}
            >
              Previous
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-gray-700"
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <RotateCw className="h-4 w-4 mr-2" />
                Flip
              </Button>
              <Button 
                className="bg-[#388282] hover:bg-[#275050]"
                onClick={nextCard}
              >
                {currentCardIndex === flashcards.length - 1 ? "Finish" : "Next"}
              </Button>
            </div>
          </div>
          
          <div className="flex justify-center">
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-[#388282] h-full transition-all" 
                style={{ width: `${((currentCardIndex + 1) / flashcards.length) * 100}%` }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Flashcards;
