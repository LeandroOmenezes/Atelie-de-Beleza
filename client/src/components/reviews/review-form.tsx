import { useState } from "react";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { insertReviewSchema } from "@shared/schema";

// Estendemos o schema de inserção adicionando validações extras
const reviewFormSchema = insertReviewSchema.extend({
  comment: z.string().min(5, "O comentário deve ter pelo menos 5 caracteres"),
  rating: z.number().min(0.5, "Selecione pelo menos meia estrela").max(5, "Máximo de 5 estrelas"),
});

type ReviewFormValues = z.infer<typeof reviewFormSchema>;

export default function ReviewForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [hoveredStar, setHoveredStar] = useState(0);

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      clientName: user?.name || "",
      comment: "",
      rating: 0,
    },
  });

  const createReviewMutation = useMutation({
    mutationFn: async (data: ReviewFormValues) => {
      // Garantir que temos o nome do cliente (do usuário autenticado)
      const reviewData = {
        ...data,
        clientName: user?.name || "Cliente",
      };
      

      const res = await apiRequest("POST", "/api/reviews", reviewData);
      return await res.json();
    },
    onSuccess: (response) => {

      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      form.reset({
        clientName: user?.name || "",
        comment: "",
        rating: 0,
      });
      toast({
        title: "Avaliação enviada",
        description: "Obrigado pelo seu feedback!",
      });
    },
    onError: (error) => {

      toast({
        title: "Erro",
        description: "Não foi possível enviar sua avaliação. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: ReviewFormValues) {
    // Verificar se usuário está logado
    if (!user) {
      toast({
        title: "Usuário não autenticado",
        description: "Você precisa estar logado para enviar uma avaliação.",
        variant: "destructive",
      });
      return;
    }
    
    // Verificar se tem avaliação (rating)
    if (!data.rating || data.rating <= 0) {
      toast({
        title: "Avaliação necessária",
        description: "Por favor, selecione pelo menos 1 estrela.",
        variant: "destructive",
      });
      return;
    }
    
    // Verificar se tem comentário
    if (!data.comment || data.comment.trim().length < 5) {
      toast({
        title: "Comentário necessário",
        description: "Por favor, escreva um comentário com pelo menos 5 caracteres.",
        variant: "destructive",
      });
      return;
    }
    
    // Se todas as validações passarem, enviar
    createReviewMutation.mutate(data);
  }

  // Renderizar estrelas com base na avaliação selecionada
  const renderStars = () => {
    const stars = [];
    const rating = form.watch("rating");

    for (let i = 1; i <= 5; i++) {
      stars.push(
        <button
          key={`star-${i}`}
          type="button"
          className="text-3xl focus:outline-none transition-colors duration-200 mx-1 hover:scale-110"
          onClick={() => {
            const currentRating = form.getValues("rating");
            const nextRating = currentRating === i ? 0 : i;
            form.setValue("rating", nextRating, { shouldValidate: true });
          }}
          onMouseEnter={() => setHoveredStar(i)}
          onMouseLeave={() => setHoveredStar(0)}
        >
          {i <= (hoveredStar || rating) ? "★" : "☆"}
        </button>
      );
    }
    return stars;
  };

  if (!user) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Avalie nossos serviços</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Você precisa estar logado para avaliar nossos serviços.
          </p>
          <Button asChild>
            <a href="/auth">Fazer Login</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Avalie nossos serviços</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avaliação</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap items-center gap-3 text-yellow-400">
                      {renderStars()}
                      {form.watch("rating") > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          className="text-base px-3 py-1"
                          onClick={() => form.setValue("rating", 0, { shouldValidate: true })}
                        >
                          Limpar
                        </Button>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    Clique nas estrelas para avaliar nosso serviço
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seu comentário</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Conte sobre sua experiência..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={createReviewMutation.isPending}
              className="w-full"
            >
              {createReviewMutation.isPending ? "Enviando..." : "Enviar Avaliação"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}