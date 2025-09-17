"use client";
import { useState, useEffect } from "react";

type Sector = { id: string; name: string };

export default function CreateInvite() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [sector, setSector] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [includeServices, setIncludeServices] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/sectors/public");
      if (r.ok) setSectors(await r.json());
    })();
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const res = await fetch("/api/admin/points/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectorId: sector, email, name, includeServices }),
    });
    if (res.ok) alert("Invite created");
    else alert("Create failed");
  }

  return (
    <form onSubmit={submit}>
      <h2>Create invite</h2>
      <div>
        <label>Sector</label>
        <select value={sector} onChange={(e) => setSector(e.target.value)}>
          <option value="">Select</option>
          {sectors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label>Include services</label>
        <input
          type="checkbox"
          checked={includeServices}
          onChange={(e) => setIncludeServices(e.target.checked)}
        />
      </div>
      <button type="submit">Create invite</button>
    </form>
  );
}
