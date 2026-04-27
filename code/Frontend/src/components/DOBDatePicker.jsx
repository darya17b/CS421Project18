import { useEffect, useMemo, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { addMonths, format, isValid, parseISO } from "date-fns";
import "react-day-picker/dist/style.css";

// parses a date string into a valid date object when possible
const parseDateValue = (value) => {
  const str = String(value || "").trim();
  if (!str) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const parsed = parseISO(str);
    return isValid(parsed) ? parsed : undefined;
  }
  const fallback = new Date(str);
  return isValid(fallback) ? fallback : undefined;
};

// formats a date object for backend friendly storage
const formatDateValue = (date) => (date && isValid(date) ? format(date, "yyyy-MM-dd") : "");
// formats a date object for the input display text
const formatDisplayValue = (date) => (date && isValid(date) ? format(date, "MM/dd/yyyy") : "");

// parses manual input text into a valid date object
const parseManualInput = (text) => {
  const raw = String(text || "").trim();
  if (!raw) return undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsedIso = parseISO(raw);
    return isValid(parsedIso) ? parsedIso : undefined;
  }

  const manualMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (manualMatch) {
    const month = Number(manualMatch[1]);
    const day = Number(manualMatch[2]);
    const year = Number(manualMatch[3]);
    const parsed = new Date(year, month - 1, day);
    if (
      isValid(parsed) &&
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return parsed;
    }
    return undefined;
  }

  const fallback = new Date(raw);
  return isValid(fallback) ? fallback : undefined;
};

// renders a dob picker with text input and calendar controls
const DOBDatePicker = ({ value, onChange, className = "" }) => {
  const selectedDate = useMemo(() => parseDateValue(value), [value]);
  const [isOpen, setIsOpen] = useState(false);
  const [month, setMonth] = useState(selectedDate || new Date());
  const [yearInput, setYearInput] = useState(format(selectedDate || new Date(), "yyyy"));
  const [inputValue, setInputValue] = useState(formatDisplayValue(selectedDate));
  const rootRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    // closes the calendar when clicking outside the picker
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (selectedDate) {
      setMonth(selectedDate);
      setYearInput(format(selectedDate, "yyyy"));
    }
    setInputValue(formatDisplayValue(selectedDate));
  }, [selectedDate]);

  useEffect(() => {
    setYearInput(format(month, "yyyy"));
  }, [month]);

  // applies a selected day and closes the calendar
  const handleDaySelect = (date) => {
    onChange(formatDateValue(date));
    setIsOpen(false);
  };

  // updates the month view when the year input changes
  const handleYearInputChange = (nextYear) => {
    const digits = nextYear.replace(/\D/g, "").slice(0, 4);
    setYearInput(digits);
    if (digits.length === 4) {
      const parsedYear = Number(digits);
      if (!Number.isNaN(parsedYear) && parsedYear > 0) {
        setMonth(new Date(parsedYear, month.getMonth(), 1));
      }
    }
  };

  // validates and commits typed input when editing is finished
  const commitManualInput = () => {
    const parsed = parseManualInput(inputValue);
    if (!String(inputValue || "").trim()) {
      onChange("");
      return;
    }
    if (!parsed) {
      setInputValue(formatDisplayValue(selectedDate));
      return;
    }
    onChange(formatDateValue(parsed));
    setMonth(parsed);
    setYearInput(format(parsed, "yyyy"));
    setInputValue(formatDisplayValue(parsed));
  };

  // updates input state and syncs valid typed dates immediately
  const handleInputChange = (nextValue) => {
    setInputValue(nextValue);
    const parsed = parseManualInput(nextValue);
    if (!String(nextValue || "").trim()) {
      onChange("");
      return;
    }
    if (!parsed) return;
    onChange(formatDateValue(parsed));
    setMonth(parsed);
    setYearInput(format(parsed, "yyyy"));
  };

  return (
    <div className="relative" ref={rootRef}>
      <input
        type="text"
        className={`${className} pr-12`}
        value={inputValue}
        onChange={(event) => handleInputChange(event.target.value)}
        onBlur={commitManualInput}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitManualInput();
          }
        }}
        placeholder="MM/DD/YYYY"
        aria-label="Date of Birth"
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 hover:text-gray-900"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label="Open date picker"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-full z-50 mt-2 w-[14.25rem] rounded-lg border border-gray-200 bg-white p-2 shadow-xl">
          <div className="mb-1 flex items-center justify-between gap-1">
            <button
              type="button"
              className="rounded border border-gray-300 px-1.5 py-1 text-xs text-gray-700 hover:bg-gray-100"
              onClick={() => setMonth((prev) => addMonths(prev, -1))}
              aria-label="Previous month"
            >
              {"<"}
            </button>
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-gray-900">{format(month, "MMMM")}</span>
              <input
                type="text"
                inputMode="numeric"
                className="w-14 rounded border border-gray-300 px-1.5 py-1 text-xs text-gray-900"
                value={yearInput}
                onChange={(event) => handleYearInputChange(event.target.value)}
                aria-label="Year"
              />
            </div>
            <button
              type="button"
              className="rounded border border-gray-300 px-1.5 py-1 text-xs text-gray-700 hover:bg-gray-100"
              onClick={() => setMonth((prev) => addMonths(prev, 1))}
              aria-label="Next month"
            >
              {">"}
            </button>
          </div>

          <DayPicker
            mode="single"
            month={month}
            onMonthChange={setMonth}
            selected={selectedDate}
            onSelect={handleDaySelect}
            showOutsideDays
            hideNavigation
            styles={{
              caption: { display: "none" },
              month: { width: "100%" },
              table: { width: "100%" },
            }}
            classNames={{
              root: "text-xs",
              month_caption: "hidden",
              caption_label: "hidden",
              nav: "hidden",
              weekdays: "mb-1",
              weekday: "h-7 w-7 text-xs text-gray-600",
              day: "h-7 w-7",
              day_button:
                "h-7 w-7 rounded-md text-xs text-gray-900 hover:bg-[#981e32]/75 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#981e32]/70 focus-visible:ring-offset-1",
              today: "font-semibold text-[#981e32]/85",
              selected:
                "bg-[#981e32]/85 text-white hover:bg-[#981e32]/75 hover:text-white",
              outside: "text-gray-400",
            }}
          />

          <div className="mt-1 flex items-center justify-between">
            <button
              type="button"
              className="text-[11px] font-medium text-gray-600 hover:text-gray-900"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
            >
              Clear
            </button>
            <button
              type="button"
              className="text-[11px] font-medium text-[#981e32] hover:opacity-80"
              onClick={() => {
                const today = new Date();
                onChange(formatDateValue(today));
                setMonth(today);
                setIsOpen(false);
              }}
            >
              Today
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DOBDatePicker;
