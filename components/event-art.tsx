/* eslint-disable @next/next/no-img-element -- Source images load in the browser; never proxy untrusted URLs through the server. */
import {
  Music2,
  ShoppingBasket,
  Palette,
  Sun,
  Utensils,
  Sparkles,
  Trophy,
  Trees,
} from 'lucide-react';
const themes = [
  { match: /music|nightlife/i, Icon: Music2, name: 'music', word: 'GOOD SOUNDS' },
  { match: /market/i, Icon: ShoppingBasket, name: 'market', word: 'LOCAL FINDS' },
  { match: /art|culture/i, Icon: Palette, name: 'arts', word: 'A LITTLE INSPIRATION' },
  { match: /food|drink/i, Icon: Utensils, name: 'food', word: 'SOMETHING DELICIOUS' },
  { match: /outdoor/i, Icon: Trees, name: 'outdoors', word: 'GET OUT THERE' },
  { match: /sport/i, Icon: Trophy, name: 'sports', word: 'IN GOOD COMPANY' },
  { match: /festival/i, Icon: Sparkles, name: 'festival', word: 'MAKE A DAY OF IT' },
];
export function EventArt({
  category = '',
  title,
  imageUrl,
}: {
  category?: string;
  title: string;
  imageUrl?: string | null;
}) {
  const theme = themes.find((t) => t.match.test(category)) || {
    Icon: Sun,
    name: 'community',
    word: 'RIGHT HERE, TOGETHER',
  };
  return (
    <div className={`event-art art-${theme.name}`} aria-hidden="true">
      {imageUrl ? (
        <img src={imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <>
          <span className="art-orbit orbit-one" />
          <span className="art-orbit orbit-two" />
          <span className="art-spark">✳</span>
          <theme.Icon className="art-icon" strokeWidth={1.2} />
          <span className="art-word">{theme.word}</span>
          <span className="art-coordinate">YQG / {title.length.toString().padStart(2, '0')}</span>
        </>
      )}
    </div>
  );
}
