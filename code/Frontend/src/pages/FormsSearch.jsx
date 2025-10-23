import { useState } from "react";
import FormsListRow from "./FormsListRow";
import Modal from "../components/Modal";
import { useMockStore } from "../store/mockStore";
import { useToast } from "../components/Toast";
import { downloadResourcePdf } from "../utils/pdf";

const FormsSearch = () => {
  const { items, toggleProposed } = useMockStore();
  const toast = useToast();
  const [artifactsOpen, setArtifactsOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  const onArtifacts = (item) => {
    setCurrent(item);
    setArtifactsOpen(true);
  };

  const onPropose = (item) => {
    // Toggle flag and show a toast
    toggleProposed(item.id);
    toast.show("Edits proposed (stub)", { type: "success" });
  };

  const visible = items.filter((it) => !it.draftOf);

  return (
    <section className="w-full p-4 text-center">
      <div className="flex items-center justify-center mb-3">
        <h2 className="text-2xl font-semibold">Forms Search</h2>
      </div>

      {visible.length === 0 ? (
        <div className="text-gray-600 border rounded-md p-6 text-center">No scripts found. Try creating one via Request New.</div>
      ) : (
        <div className="space-y-3 w-full mx-auto">
          {visible.slice(0, 10).map((it) => (
            <FormsListRow key={it.id} item={it} onArtifacts={onArtifacts} onPropose={onPropose} />
          ))}
        </div>
      )}

      <Modal open={artifactsOpen} title={`Resources for ${current?.id}`} onClose={() => setArtifactsOpen(false)}>
        {!current ? null : (
          <div className="space-y-2">
            {(current.artifacts && current.artifacts.length ? current.artifacts : ["Placeholder.pdf", "Placeholder.png"]).map((a, idx) => (
              <div key={idx} className="flex items-center justify-between border rounded px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-gray-100">📄</span>
                  <span>{a}</span>
                </div>
                <button className="rounded border px-2 py-1 hover:bg-gray-50" title="Create PDF" onClick={() => downloadResourcePdf(current, a)}>
                  Download PDF
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </section>
  );
};

export default FormsSearch;
