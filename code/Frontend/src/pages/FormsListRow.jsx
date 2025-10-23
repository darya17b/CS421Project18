import { Link } from "react-router-dom";

const FormsListRow = ({ item, onArtifacts, onPropose }) => {
  const proposed = Boolean(item.proposed);
  return (
    <div
      className={`relative flex items-start justify-between border rounded-md p-3 bg-white w-full ${
        proposed ? "border-yellow-400 bg-yellow-50" : ""
      }`}
      title={proposed ? "Edits have been proposed for this draft" : undefined}
    >
      <div>
        <div className="font-semibold">{item.title}</div>
        <div className="text-sm text-gray-600">{item.patient} • {item.department} • {item.createdAt}</div>
        {item.draftOf && (
          <div className="mt-1 inline-block rounded bg-yellow-100 text-yellow-800 px-2 py-0.5 text-xs">Draft of {item.draftOf}</div>
        )}
      </div>
      <div className="flex gap-2">
        <Link to={`/forms/${encodeURIComponent(item.id)}`}>
          <button className="rounded border px-3 py-1 hover:bg-gray-50">View</button>
        </Link>
        <button
          className={`rounded border px-3 py-1 hover:bg-gray-50 ${proposed ? 'bg-yellow-100 border-yellow-300 text-yellow-800' : ''}`}
          title={proposed ? 'Edits have been proposed for this draft' : 'Propose edits'}
          onClick={() => onPropose(item)}
        >
          Propose Edits
        </button>
        <button className="rounded border px-3 py-1 hover:bg-gray-50" onClick={() => onArtifacts(item)}>
          Resources
        </button>
      </div>
      {proposed && (
        <span
          className="absolute top-2 right-2 inline-flex items-center justify-center text-xs font-semibold text-yellow-900 bg-yellow-300 rounded px-2 py-0.5 shadow"
          title="Edits have been proposed for this draft"
          aria-hidden="true"
        >
          ⚑
        </span>
      )}
    </div>
  );
};

export default FormsListRow;
