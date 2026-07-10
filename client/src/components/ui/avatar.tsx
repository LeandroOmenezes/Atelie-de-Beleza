import { User } from "lucide-react";

interface AvatarProps {
  userId?: number | null;
  userName: string;
  imageUrl?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

export function Avatar({ userId, userName, imageUrl, size = "md", className = "" }: AvatarProps) {
  const sizeClasses = {
    xs: "h-6 w-6",
    sm: "h-8 w-8", 
    md: "h-10 w-10",
    lg: "h-12 w-12"
  };

  const iconSizes = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-5 w-5", 
    lg: "h-6 w-6"
  };

  const finalImageUrl = imageUrl;
  const initials = userName ? userName.charAt(0).toUpperCase() : "U";
  const imageSrc = finalImageUrl
    ? finalImageUrl.startsWith("http")
      ? `${finalImageUrl}${finalImageUrl.includes("?") ? "&" : "?"}cache=${Date.now()}`
      : finalImageUrl
    : undefined;

  return (
    <div className={`${sizeClasses[size]} relative rounded-full overflow-hidden border border-gray-200 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center ${className}`}>
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={`Foto de ${userName}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              const span = document.createElement('span');
              span.className = 'text-white font-medium text-xs';
              span.textContent = initials;
              parent.appendChild(span);
            }
          }}
        />
      ) : (
        <span className="text-white font-medium text-xs">{initials}</span>
      )}
    </div>
  );
}