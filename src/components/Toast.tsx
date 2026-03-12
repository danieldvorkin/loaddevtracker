import { useEffect } from "react";

export function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const id = setTimeout(onClose, 3500);
    return () => clearTimeout(id);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 bg-gray-800 text-white px-4 py-2 rounded shadow-lg">
      {message}
    </div>
  );
}
