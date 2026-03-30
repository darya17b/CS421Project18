import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { downloadScriptPdf, getScriptPdfUrl } from "../utils/pdf";

const FormsListRow = ({ item, onArtifacts, onPropose, onDelete, onSendBackToRequests }) => {
  const location = useLocation();
  const [manageOpen, setManageOpen] = useState(false);
  const manageMenuRef = useRef(null);
  const from = `${location.pathname}${location.search}${location.hash}`;
  const title = item?.title || item?.admin?.reson_for_visit || item?.admin?.reason_for_visit || "Untitled";
  const patient = typeof item?.patient === "string"
    ? item.patient
    : (item?.patient?.name || item?.patient_name || "Unknown");
  const department = item?.department || item?.admin?.class || "General";
  const createdAt = item?.createdAt || item?.admin?.event_dates || "";
  const meta = [patient, department, createdAt].filter(Boolean).join(" | ");

  const handleDownload = () => {
    try {
      downloadScriptPdf(item, item?.versions?.[0]);
    } catch {
     
    }
  };
  const handlePreview = () => {
    try {
      const url = getScriptPdfUrl(item, item?.versions?.[0]);
      window.open(url, "_blank", "noopener");
    } catch {
    
    }
  };

  useEffect(() => {
    if (!manageOpen) return undefined;
    const onDocumentClick = (event) => {
      if (manageMenuRef.current?.contains(event.target)) return;
      setManageOpen(false);
    };
    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, [manageOpen]);

  return (
    <div className="list-row">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex items-start gap-3 flex-1">
          <span className="list-row__accent" aria-hidden="true" />
          <div>
            <div className="font-semibold text-lg text-gray-900">{title}</div>
            {meta ? <div className="text-sm text-gray-500">{meta}</div> : null}
          </div>
        </div>
        <div className="list-row__buttons flex flex-wrap gap-2 md:justify-end">
          <Link to={`/forms/${encodeURIComponent(item.id)}`} state={{ from }}>View</Link>
          <button onClick={handlePreview}>Preview</button>
          <button onClick={handleDownload}>Download</button>
          {onDelete || onSendBackToRequests ? (
            <div className="relative" ref={manageMenuRef}>
              <button
                className="border-red-600 text-red-600 hover:border-red-700 hover:bg-red-700 hover:text-white"
                onClick={() => setManageOpen((prev) => !prev)}
              >
                Manage
              </button>
              {manageOpen ? (
                <div className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                  {onSendBackToRequests ? (
                    <button
                      type="button"
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => {
                        setManageOpen(false);
                        onSendBackToRequests(item);
                      }}
                    >
                      Send back to Requests
                    </button>
                  ) : null}
                  {onDelete ? (
                    <button
                      type="button"
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                      onClick={() => {
                        setManageOpen(false);
                        onDelete(item);
                      }}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default FormsListRow;
