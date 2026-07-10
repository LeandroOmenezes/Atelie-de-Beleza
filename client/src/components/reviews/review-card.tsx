import { Review } from "@shared/schema";
import { useState, useEffect } from "react";
import { Heart, ThumbsUp } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ReviewComments } from "./review-comments";
import { Avatar } from "@/components/ui/avatar";

interface ReviewCardProps {
  review: Review;
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const [likes, setLikes] = useState(review.likes);
  const [thumbsLikes, setThumbsLikes] = useState(review.thumbsLikes || 0);
  const [userHeartLiked, setUserHeartLiked] = useState(false);
  const [userThumbsLiked, setUserThumbsLiked] = useState(false);
  const [isHeartAnimating, setIsHeartAnimating] = useState(false);
  const [isThumbsAnimating, setIsThumbsAnimating] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Buscar likes do usuário
  const { data: userLikes } = useQuery<{heartLikes: number[], thumbsLikes: number[]}>({
    queryKey: ['/api/user/likes'],
    enabled: !!user,
  });

  // Verificar se o usuário curtiu esta avaliação
  useEffect(() => {
    if (userLikes) {
      setUserHeartLiked(userLikes.heartLikes.includes(review.id));
      setUserThumbsLiked(userLikes.thumbsLikes.includes(review.id));
    }
  }, [userLikes, review.id]);

  const heartLikeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/reviews/${review.id}/like/heart`);
      return await res.json();
    },
    onSuccess: (response) => {
      setLikes(response.review.likes);
      setUserHeartLiked(response.userLiked);
      setIsHeartAnimating(true);
      setTimeout(() => setIsHeartAnimating(false), 1000);
      
      // Atualiza a cache das queries (apenas reviews principais)
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/likes"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível processar o like",
        variant: "destructive",
      });
    }
  });

  const thumbsLikeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/reviews/${review.id}/like/thumbs`);
      return await res.json();
    },
    onSuccess: (response) => {
      setThumbsLikes(response.review.thumbsLikes);
      setUserThumbsLiked(response.userLiked);
      setIsThumbsAnimating(true);
      setTimeout(() => setIsThumbsAnimating(false), 1000);
      
      // Atualiza a cache das queries (apenas reviews principais)
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/likes"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível processar o like",
        variant: "destructive",
      });
    }
  });

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(<i key={`full-${i}`} className="fas fa-star"></i>);
    }
    
    // Add half star if needed
    if (hasHalfStar) {
      stars.push(<i key="half" className="fas fa-star-half-alt"></i>);
    }
    
    // Add empty stars
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<i key={`empty-${i}`} className="far fa-star"></i>);
    }
    
    return stars;
  };

  const handleHeartClick = () => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para curtir avaliações",
        variant: "destructive",
      });
      return;
    }
    heartLikeMutation.mutate();
  };

  const handleThumbsClick = () => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para curtir avaliações",
        variant: "destructive",
      });
      return;
    }
    thumbsLikeMutation.mutate();
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
      <div className="flex items-center mb-4">
        <Avatar
          userId={review.userId}
          userName={review.clientName}
          imageUrl={review.userId && review.userProfileImageBase64 ? (review.userProfileImageBase64.startsWith('http') ? review.userProfileImageBase64 : `/api/images/user/${review.userId}`) : undefined}
          size="lg"
          className="mr-4 flex-shrink-0"
        />
        <div>
          <h3 className="text-lg font-bold text-gray-800">{review.clientName}</h3>
          <div className="flex text-yellow-400">
            {review.rating !== null && review.rating !== undefined ? renderStars(review.rating as number) : null}
          </div>
        </div>
      </div>
      
      <p className="text-gray-700 mb-4">{review.comment}</p>
      
      <div className="flex items-center justify-end gap-4 mt-2">
        {/* Botão de coração */}
        <button 
          onClick={handleHeartClick}
          disabled={heartLikeMutation.isPending}
          className={`flex items-center gap-1 transition-colors duration-200 focus:outline-none ${
            userHeartLiked 
              ? 'text-red-500 hover:text-red-600' 
              : 'text-gray-500 hover:text-red-500'
          }`}
          title={userHeartLiked ? "Remover curtida" : "Curtir avaliação"}
        >
          <Heart 
            className={`${
              isHeartAnimating 
                ? 'animate-pulse text-red-500 fill-red-500' 
                : userHeartLiked 
                  ? 'text-red-500 fill-red-500' 
                  : 'text-gray-500'
            }`} 
            size={16} 
          />
          <span className="text-sm font-medium">{likes}</span>
        </button>

        {/* Botão de joinha */}
        <button 
          onClick={handleThumbsClick}
          disabled={thumbsLikeMutation.isPending}
          className={`flex items-center gap-1 transition-colors duration-200 focus:outline-none ${
            userThumbsLiked 
              ? 'text-blue-500 hover:text-blue-600' 
              : 'text-gray-500 hover:text-blue-500'
          }`}
          title={userThumbsLiked ? "Remover aprovação" : "Aprovar avaliação"}
        >
          <ThumbsUp 
            className={`transition-transform duration-200 ${
              isThumbsAnimating 
                ? 'animate-pulse text-blue-500 fill-blue-500 scale-110' 
                : userThumbsLiked 
                  ? 'text-blue-500 fill-blue-500' 
                  : 'text-gray-500'
            }`} 
            size={16} 
          />
          <span className="text-sm font-medium">{thumbsLikes}</span>
        </button>
      </div>

      {/* Sistema de comentários */}
      <ReviewComments reviewId={review.id} />
    </div>
  );
}