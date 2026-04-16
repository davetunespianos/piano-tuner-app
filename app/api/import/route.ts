import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabase-server";

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || "").trim();
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function formatPhone(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const formData = await request.formData();

    let clientsImported = 0;
    let clientsSkipped = 0;
    let pianosImported = 0;
    let pianosSkipped = 0;
    const errors: string[] = [];

    const gazelleIdToSupabaseId: Record<string, string> = {};

    const clientFile = formData.get("clients") as File | null;
    if (clientFile) {
      const text = await clientFile.text();
      const rows = parseCSV(text);

      for (const row of rows) {
        try {
          const gazelleId = row["Client ID"];
          const email = row["Default Contact Default Email"];
          const firstName = row["Default Contact First Name"];
          const lastName = row["Default Contact Last Name"];

          if (!firstName) {
            clientsSkipped++;
            errors.push(`Skipped client (no first name): Row ${rows.indexOf(row) + 2}`);
            continue;
          }

          if (email) {
            const { data: existing } = await supabase
              .from("clients")
              .select("id")
              .eq("email", email)
              .single();

            if (existing) {
              gazelleIdToSupabaseId[gazelleId] = existing.id;
              clientsSkipped++;
              errors.push(`Skipped client (already exists): ${firstName} ${lastName} - ${email}`);
              continue;
            }
          }

          const { data: newClient, error: clientError } = await supabase
            .from("clients")
            .insert([{
              company_name: row["Company Name"] || null,
              first_name: firstName,
              last_name: lastName || null,
              email: email || null,
              phone: formatPhone(row["Default Contact Default Phone"]) || null,
              address: row["Default Contact Default Address Line 1"] || null,
              city: row["Default Contact Default City"] || null,
              state: row["Default Contact Default State/Province"] || null,
              zip: row["Default Contact Default Postal Code"] || null,
              notes: row["Preference Notes"] || null,
            }])
            .select("id")
            .single();

          if (clientError || !newClient) {
            errors.push(`Client ${firstName} ${lastName}: ${clientError?.message || "Unknown error"}`);
            continue;
          }

          gazelleIdToSupabaseId[gazelleId] = newClient.id;
          clientsImported++;
        } catch (err: any) {
          errors.push(`Row error: ${err.message}`);
        }
      }
    }

    const pianoFile = formData.get("pianos") as File | null;
    if (pianoFile) {
      const text = await pianoFile.text();
      const rows = parseCSV(text);

      for (const row of rows) {
        try {
          const gazelleClientId = row["Client ID"];
          const supabaseClientId = gazelleIdToSupabaseId[gazelleClientId];

          if (!supabaseClientId) {
            pianosSkipped++;
            errors.push(`Skipped piano (client not found): ${row["Make"]} ${row["Model"]} for Gazelle ID ${gazelleClientId}`);
            continue;
          }

          const make = row["Make"] === "Unknown" ? null : row["Make"] || null;
          const model = row["Model"] || null;
          const serialNumber = row["Serial Number"] || null;
          const type = row["Type"] === "unknown" ? null : row["Type"] || null;
          const location = row["Location"] || null;
          const hasLifeSaver = row["Dampp Chaser Installed"]?.toLowerCase() === "true";

          const notes = [
            location ? `Location: ${location}` : "",
            row["Notes"] || "",
          ].filter(Boolean).join("\n") || null;

          const { error: pianoError } = await supabase
            .from("pianos")
            .insert([{
              client_id: supabaseClientId,
              make,
              model,
              serial_number: serialNumber,
              type,
              notes,
              has_life_saver: hasLifeSaver,
            }]);

          if (pianoError) {
            errors.push(`Piano ${make} ${model}: ${pianoError.message}`);
            pianosSkipped++;
            continue;
          }

          pianosImported++;
        } catch (err: any) {
          errors.push(`Piano row error: ${err.message}`);
          pianosSkipped++;
        }
      }
    }

    return NextResponse.json({
      clientsImported,
      clientsSkipped,
      pianosImported,
      pianosSkipped,
      errors,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}