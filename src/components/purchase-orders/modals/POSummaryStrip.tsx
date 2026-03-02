import { ExternalLink } from "lucide-react";

interface POSummaryStripProps {
  orderId: string;
  poNumber: string;
  status: string;
  receiptStatus: string;
  supplierName: string;
  issueDate: string;
}

const statusBadgeStyles: Record<string, string> = {
  issued: "bg-blue-100 text-blue-700",
  confirmed: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  draft: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-100 text-red-700",
};

const receiptStatusBadgeStyles: Record<string, string> = {
  partial: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  pending: "bg-gray-100 text-gray-700",
  "force closed": "bg-red-100 text-red-700",
  "excess delivered": "bg-purple-100 text-purple-700",
};

function capitalize(str: string) {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function POSummaryStrip({
  orderId,
  poNumber,
  status,
  receiptStatus,
  supplierName,
  issueDate,
}: POSummaryStripProps) {
  const statusClass = statusBadgeStyles[status] ?? "bg-gray-100 text-gray-700";
  const receiptClass =
    receiptStatusBadgeStyles[receiptStatus] ?? "bg-gray-100 text-gray-700";

  return (
    <div className="bg-[#F6F7F8] border border-gray-200 rounded-md p-3 mb-4">
      {/* Row 1 */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-gray-900">{poNumber}</span>
        <ExternalLink
          size={14}
          className="text-gray-400 hover:text-[#4A51D8] cursor-pointer ml-1"
          onClick={() => window.open(`/purchase-orders/${orderId}`, "_blank")}
        />
        <span
          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${statusClass}`}
        >
          {capitalize(status)}
        </span>
        <span
          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${receiptClass}`}
        >
          {capitalize(receiptStatus)}
        </span>
      </div>

      {/* Row 2 */}
      <div className="mt-1 text-sm text-gray-500">
        {supplierName} · Issued: {formatDate(issueDate)}
      </div>
    </div>
  );
}
