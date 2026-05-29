import type { Candidate } from "@/app/discover/page";

function getAge(birthDate: string): number {
  const today = new Date();
  const dob = new Date(birthDate);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

type Props = {
  candidate: Candidate;
  style?: React.CSSProperties;
};

export default function ProfileCard({ candidate, style }: Props) {
  const age = getAge(candidate.birth_date);

  return (
    <div
      className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl bg-gray-100 select-none"
      style={style}
    >
      {candidate.avatar_url ? (
        <img
          src={candidate.avatar_url}
          alt={candidate.display_name}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-100 to-orange-100">
          <span className="text-7xl">🔥</span>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6 text-white">
        <h2 className="text-2xl font-bold">
          {candidate.display_name}, {age}
        </h2>
        <p className="text-sm text-white/80 capitalize">{candidate.gender}</p>
        {candidate.bio && (
          <p className="mt-1 text-sm text-white/70 line-clamp-2">{candidate.bio}</p>
        )}
      </div>
    </div>
  );
}
