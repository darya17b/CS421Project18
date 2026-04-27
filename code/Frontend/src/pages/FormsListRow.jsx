import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { downloadScriptPdf, getScriptPdfUrl } from "../utils/pdf";
import { formatTitleWithDobAge } from "../utils/patientAge";

// handles pick first text
const pickFirstText = (...values) => {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
};

// handles get current version entry
const getCurrentVersionEntry = (item) => {
  const versions = Array.isArray(item?.versions) ? item.versions : [];
  if (!versions.length) return null;
  return (
    versions.find((entry) => String(entry?.version || "").trim().toLowerCase() === "current")
    || versions[0]
    || null
  );
};

// handles forms list row
const FormsListRow = ({ item, onArtifacts, onPropose, onDelete, onSendBackToRequests, onClone }) => {
  const location = useLocation();
  const [manageOpen, setManageOpen] = useState(false);
  const manageMenuRef = useRef(null);
  const from = `${location.pathname}${location.search}${location.hash}`;
  const currentVersion = getCurrentVersionEntry(item);
  const currentFields =
    currentVersion?.fields && typeof currentVersion.fields === "object"
      ? currentVersion.fields
      : item;
  const title = pickFirstText(
    currentFields?.admin?.reson_for_visit,
    currentFields?.admin?.reason_for_visit,
    item?.title,
    item?.admin?.reson_for_visit,
    item?.admin?.reason_for_visit
  ) || "Untitled";
  const dob =
    currentFields?.patient?.date_of_birth
    || currentFields?.patient?.dob
    || item?.patient?.date_of_birth
    || item?.patient?.dob
    || "";
  const displayTitle = formatTitleWithDobAge(title, dob) || "Untitled";
  const patient = pickFirstText(
    currentFields?.patient?.name,
    typeof item?.patient === "string" ? item.patient : item?.patient?.name,
    item?.patient_name
  ) || "Unknown";
  const department = pickFirstText(
    currentFields?.admin?.class,
    item?.department,
    item?.admin?.class
  ) || "General";
  const createdAt = pickFirstText(currentVersion?.createdAt, item?.createdAt, item?.admin?.event_dates);
  const meta = [patient, department, createdAt].filter(Boolean).join(" | ");

  // handles handle download
  const handleDownload = () => {
    try {
      downloadScriptPdf(item, currentVersion || undefined);
    } catch {
     
    }
  };
  // handles handle preview
  const handlePreview = () => {
    try {
      const url = getScriptPdfUrl(item, currentVersion || undefined);
      window.open(url, "_blank", "noopener");
    } catch {
    
    }
  };

  useEffect(() => {
    if (!manageOpen) return undefined;
    // handles on document click
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
            <div className="font-semibold text-lg text-gray-900">{displayTitle}</div>
            {meta ? <div className="text-sm text-gray-500">{meta}</div> : null}
          </div>
        </div>
        <div className="list-row__buttons flex flex-wrap gap-2 md:justify-end">
          <Link to={`/forms/${encodeURIComponent(item.id)}`} state={{ from }}>View</Link>
          <button onClick={handlePreview}>Preview</button>
          <button onClick={handleDownload}>Download</button>
          {onClone ? <button onClick={() => onClone(item)}>Clone</button> : null}
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
