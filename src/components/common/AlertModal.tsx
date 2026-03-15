import React from "react";

interface AlertModalProps {
  message: string;
  onClose: () => void;
  type?: "success" | "error" | "info";
}

const AlertModal: React.FC<AlertModalProps> = ({
  message,
  onClose,
  type = "info",
}) => {
  const iconMap = {
    success: (
      <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-6 h-6 text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
    ),
    error: (
      <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-6 h-6 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
    ),
    info: (
      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-6 h-6 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
          />
        </svg>
      </div>
    ),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
        {iconMap[type]}
        <p className="text-center text-gray-200 mb-6 whitespace-pre-line">
          {message}
        </p>
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded bg-primary hover:bg-primary/80 transition-colors text-sm"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
