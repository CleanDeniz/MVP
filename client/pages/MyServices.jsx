import React, { useEffect, useState } from "react";
import { apiGET } from "../api.js";

export default function MyServices() {
  const [items, setItems] = useState([]);

  async function load() {
    try {
      const res = await apiGET("/api/user/purchases");
      setItems(res.items || []);
    } catch {
      setItems([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (!items.length) {
    return <div className="empty">Пока ничего не куплено</div>;
  }

  return (
    <div className="grid">
      {items.map((p) => (
        <div key={p.id} className="card">
          <div className="row">
            <div>
              <b>{p.title}</b>
              <div style={{ color: "#aaa", fontSize: 12 }}>
                {p.partner} • {p.price} б.
              </div>
            </div>
            <div style={{ color: "#888", fontSize: 12 }}>
              {new Date(p.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
