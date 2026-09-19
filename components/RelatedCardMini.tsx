'use client';

type MiniCard = {
  name: string;
  image: string;
};

export default function RelatedCardMini({
  card,
  onClick,
}: {
  card: MiniCard;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="related-card-mini"
      onClick={onClick}
      aria-label={`Open ${card.name}`}
    >
      <img src={card.image} alt="" loading="lazy" decoding="async" />
      <span className="related-card-mini__name">{card.name}</span>
    </button>
  );
}