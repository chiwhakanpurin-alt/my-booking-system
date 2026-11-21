"use client";
import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "./button";

export interface TimePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  showCurrentTimeButton?: boolean;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  disabled,
  error,
  className,
  showCurrentTimeButton = false,
}) => {
  const getDefaultTime = React.useCallback(() => {
    const now = new Date();
    const h = now.getHours();
    const m = Math.floor(now.getMinutes() / 5) * 5;
    return {
      hour: String(h).padStart(2, "0"),
      minute: String(m).padStart(2, "0"),
    };
  }, []);

  const [hour, setHour] = React.useState<string>("");
  const [minute, setMinute] = React.useState<string>("");

  const handleSetCurrentTime = React.useCallback(() => {
    const def = getDefaultTime();
    setHour(def.hour);
    setMinute(def.minute);
    if (onChange) {
      const newValue = `${def.hour}:${def.minute}`;
      onChange(newValue);
    }
  }, [getDefaultTime, onChange]);

  React.useEffect(() => {
    if (!value) {
      // Do not force default time automatically if form state is empty
    } else if (typeof value === "string" && value.includes(":")) {
      const [h, m] = value.split(":");
      setHour(h ? h.padStart(2, "0") : "");
      setMinute(m ? m.padStart(2, "0") : "");
    }
  }, [value]);

  const handleChange = React.useCallback(
    (h: string, m: string) => {
      setHour(h);
      setMinute(m);
      if (h && m && onChange) {
        const newValue = `${h}:${m}`;
        if (newValue !== value) {
          onChange(newValue);
        }
      }
    },
    [onChange, value]
  );

  return (
    <div
      className={
        className ??
        "flex w-full flex-col items-center gap-2" +
          (error ? " rounded-xl border border-red-500 p-2" : "")
      }
    >
      <div className="flex w-full items-center gap-2">
        {/* ช่องชั่วโมง 00 ถึง 23 น. */}
        <div className="flex-1">
          <Select
            disabled={disabled}
            onValueChange={React.useCallback(
              (val: string) => handleChange(val, minute || "00"),
              [minute, handleChange]
            )}
            value={hour}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue placeholder="ชม. (00-23)" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 24 }, (_, i) =>
                String(i).padStart(2, "0")
              ).map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span className="font-bold text-slate-400 dark:text-zinc-500">:</span>

        {/* ช่องนาที 00 ถึง 59 */}
        <div className="flex-1">
          <Select
            disabled={disabled}
            onValueChange={React.useCallback(
              (val: string) => handleChange(hour || "08", val),
              [hour, handleChange]
            )}
            value={minute}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue placeholder="นาที" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 60 }, (_, i) =>
                String(i).padStart(2, "0")
              ).map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* หน่วยเวลาของไทย */}
        <span className="text-sm font-bold text-slate-600 dark:text-zinc-400 shrink-0">
          น.
        </span>
      </div>

      {showCurrentTimeButton && (
        <Button
          variant={"ghost"}
          size={"sm"}
          disabled={disabled}
          onClick={handleSetCurrentTime}
          className="text-xs"
        >
          ตั้งเป็นเวลาปัจจุบัน
        </Button>
      )}
    </div>
  );
};
