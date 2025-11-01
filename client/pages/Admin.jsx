import React, { useEffect, useState } from "react";
import { apiGET, apiPOST, apiPATCH } from "../api.js";

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [svc, setSvc] = useState({ title: "", partner: "", price: "", description: "" });

  async function loadAll() {
    const [u, s] = await Promise.all([
      apiGET("/api/admin/users").catch(() => ({ users: [] })),
      apiGET("/api/services").catch(() => ({ services: [] }))
    ]);
    setUsers(u.users || []);
    setServices(s.services || []);
  }

  async function addBonus() {
    if (!phone || !amount) return alert("Телефон и сумма обязательны");
    await apiPOST("/api/admin/bonus", { phone, amount: Number(amount) }).catch(() => alert("Ошибка начисления"));
    setPhone(""); setAmount("");
    loadAll();
  }

  async function addService() {
    if (!svc.title || !svc.price) return alert("Название и цена обязательны");
    await apiPOST("/api/admin/services", {
      title: svc.title,
      partner: svc.partner,
      price: Number(svc.price),
      description: svc.description
    }).catch(() => alert("Ошибка добавления услуги"));
    setSvc({ title: "", partner: "", price: "", description: "" });
    loadAll();
  }

  async function toggleActive(id, active) {
    await apiPATCH(`/api/admin/services/${id}`, { active: active ? 0 : 1 }).catch(() => alert("Ошибка статуса"));
    loadAll();
  }

  useEffect(() => { loadAll(); }, []);

  return (
    <div className="grid">
      <div className="card">
        <h3>Начислить бонусы</h3>
        <label>Телефон</label>
        <input placeholder="+7..." value={phone} onChange={e => setPhone(e.target.value)} />
        <label>Сумма</label>
        <input type="number" placeholder="100" value={amount} onChange={e => setAmount(e.target.value)} />
        <div style={{ marginTop: 8 }}>
          <button className="btn primary" onClick={addBonus}>Начислить</button>
        </div>
      </div>

      <div className="card">
        <h3>Добавить услугу</h3>
        <label>Название</label>
        <input value={svc.title} onChange={e => setSvc({ ...svc, title: e.target.value })} />
        <label>Партнёр</label>
        <input value={svc.partner} onChange={e => setSvc({ ...svc, partner: e.target.value })} />
        <label>Цена (бонусы)</label>
        <input type="number" value={svc.price} onChange={e => setSvc({ ...svc, price: e.target.value })} />
        <label>Описание</label>
        <textarea rows={3} value={svc.description} onChange={e => setSvc({ ...svc, description: e.target.value })} />
        <div style={{ marginTop: 8 }}>
          <button className="btn primary" onClick={addService}>Добавить</button>
        </div>
      </div>

      <div className="card">
        <h3>Услуги ({services.length})</h3>
        {services.map(s => (
          <div key={s.id} className="row" style={{ padding: "8px 0", borderBottom: "1px dashed #333" }}>
            <div>
              <b>{s.title}</b>
              <div style={{ color: "#aaa", fontSize: 12 }}>{s.partner} • {s.price} б.</div>
            </div>
            <button className="btn small" onClick={() => toggleActive(s.id, s.active)}>
              {s.active ? "Скрыть" : "Показать"}
            </button>
          </div>
        ))}
        {!services.length && <div className="empty">Пока нет услуг</div>}
      </div>

      <div className="card">
        <h3>Пользователи ({users.length})</h3>
        {users.map(u => (
          <div key={u.id} className="row" style={{ padding: "6px 0", borderBottom: "1px dashed #333" }}>
            <div>📱 {u.phone || "—"}</div>
            <div>💰 {u.balance}</div>
            <div style={{ color: "#aaa", fontSize: 12 }}>{u.username || u.tg_id}</div>
          </div>
        ))}
        {!users.length && <div className="empty">Нет пользователей</div>}
      </div>
    </div>
  );
}
