"use client";

import { useState, useEffect } from "react";

/**
 * Component that displays the next scheduled run time in both ET and local timezone
 * The cron job runs at 3:55 PM ET (varies in UTC due to DST) on weekdays
 */
export function NextRunTime() {
  const [localTime, setLocalTime] = useState<string | null>(null);
  const [showLocal, setShowLocal] = useState(false);

  useEffect(() => {
    // Check user's timezone
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const isEastern = userTimezone.includes("New_York") || 
                      userTimezone.includes("Eastern") ||
                      userTimezone.includes("Detroit") ||
                      userTimezone.includes("Indiana");
    
    if (isEastern) {
      setShowLocal(false);
      return;
    }

    // Calculate what 3:55 PM ET is in local time
    // Create a date object in the user's timezone for "today at 3:55 PM ET"
    try {
      // Get current date parts
      const now = new Date();
      
      // Create a date string in ET timezone
      const etDateStr = now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
      
      // Parse 3:55 PM ET as a UTC time by using the ET offset
      const etTime = new Date(`${etDateStr}T15:55:00`);
      
      // Get the ET offset
      const etFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        timeZoneName: "shortOffset",
      });
      const etParts = etFormatter.formatToParts(now);
      const etOffsetStr = etParts.find(p => p.type === "timeZoneName")?.value || "GMT-5";
      const etOffsetMatch = etOffsetStr.match(/GMT([+-]\d+)/);
      const etOffsetHours = etOffsetMatch ? parseInt(etOffsetMatch[1]) : -5;
      
      // Create the actual UTC time for 3:55 PM ET
      const utcHour = 15 - etOffsetHours; // Convert ET hour to UTC
      const runTimeUTC = new Date(Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        utcHour,
        55,
        0
      ));
      
      // Format in local timezone
      const localFormatter = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      
      const localTimeStr = localFormatter.format(runTimeUTC);
      setLocalTime(localTimeStr);
      setShowLocal(true);
    } catch {
      // If timezone conversion fails, just don't show local time
      setShowLocal(false);
    }
  }, []);

  if (!showLocal) {
    return (
      <>
        <div className="text-2xl font-bold">3:55 PM</div>
        <p className="text-xs text-muted-foreground">
          ET (End of Day)
        </p>
      </>
    );
  }

  return (
    <>
      <div className="text-2xl font-bold">3:55 PM ET</div>
      <p className="text-xs text-muted-foreground">
        {localTime} your time
      </p>
    </>
  );
}
