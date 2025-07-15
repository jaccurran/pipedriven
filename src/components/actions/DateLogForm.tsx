"use client"

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface DateLogFormProps {
  onSubmit: (data: { date: string }) => void;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | null;
  initialDate?: string; // For testing purposes
}

export function DateLogForm({
  onSubmit,
  onCancel,
  isLoading = false,
  error = null,
  initialDate,
}: DateLogFormProps) {
  const [date, setDate] = useState("");
  const [errors, setErrors] = useState<{ date?: string }>({});

  // Initialize with today's date or provided initial date
  useEffect(() => {
    if (initialDate) {
      setDate(initialDate);
    } else {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      setDate(`${yyyy}-${mm}-${dd}`);
    }
  }, [initialDate]);

  const validateForm = (): boolean => {
    const newErrors: { date?: string } = {};
    // Validate date is required
    if (!date.trim()) {
      newErrors.date = "Date is required";
    } else {
      const selectedDate = new Date(date);
      const today = new Date();
      selectedDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      if (selectedDate > today) {
        newErrors.date = "Date cannot be in the future";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({ date });
    }
  };

  // Change handler to accept a string value (not an event)
  const handleDateChange = (value: string) => {
    setDate(value);
    // Only clear error if the new value is valid
    if (value.trim() && errors.date) {
      const selectedDate = new Date(value);
      const today = new Date();
      selectedDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      if (selectedDate <= today) {
        setErrors((prev) => ({ ...prev, date: undefined }));
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      role="form"
      aria-label="Log date-based activity"
      data-testid="date-log-form"
    >
      <div className="space-y-4">
        <div>
          <Input
            id="date"
            type="date"
            label="Date"
            value={date}
            onChange={handleDateChange}
            className={errors.date ? "border-red-300 focus:border-red-500 focus:ring-red-500" : ""}
            aria-describedby={errors.date ? "date-error" : undefined}
            disabled={isLoading}
          />
          {errors.date && (
            <p className="mt-1 text-sm text-red-600" id="date-error">
              {errors.date}
            </p>
          )}
        </div>
        {(typeof error === "string" && error.trim()) && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
          data-testid="cancel-button"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading}
          data-testid="submit-button"
        >
          Log Date
        </Button>
      </div>
    </form>
  );
} 