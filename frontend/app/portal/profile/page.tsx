"use client";
import { useState } from "react";
import { PortalLayout } from "../../../components/PortalLayout";
import { request, useWorkspace } from "../../../components/useWorkspace";
export default function Profile() {
  const me = useWorkspace(),
    [message, setMessage] = useState("");
  if (!me) return <div className="loading">Loading profile…</div>;
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await request("/profile", {
      method: "PATCH",
      body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
    });
    setMessage("Profile updated.");
  }
  return (
    <PortalLayout me={me}>
      <header className="page-head">
        <div>
          <p className="eyebrow">ACCOUNT</p>
          <h1>Profile</h1>
          <p>Manage your personal contact information.</p>
        </div>
      </header>
      <form className="card settings" onSubmit={save}>
        <label>
          Name
          <input name="name" defaultValue={me.user.name} />
        </label>
        <label>
          Email
          <input value={me.user.email} disabled />
        </label>
        <label>
          Phone
          <input name="phone" defaultValue={me.user.phone || ""} />
        </label>
        <label>
          Job title
          <input name="jobTitle" defaultValue={me.user.jobTitle || ""} />
        </label>
        <button>Save profile</button>
        {message && <p className="success">{message}</p>}
      </form>
    </PortalLayout>
  );
}
