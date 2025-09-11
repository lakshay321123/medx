import { emergencyNumbers } from '@/lib/emergency';

export default function EmergencyCallButtons({ country }: { country?: string }) {
  const numbers = emergencyNumbers(country);
  if (!numbers) return null;
  return (
    <div className="flex gap-2">
      {Object.values(numbers).map((num, i) => (
        <a
          key={i}
          href={`tel:${num}`}
          className="rounded bg-red-600 px-4 py-2 text-white"
        >
          Call {num}
        </a>
      ))}
    </div>
  );
}
