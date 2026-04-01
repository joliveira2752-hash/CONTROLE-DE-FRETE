import { useEffect, useState } from "react"
import { initializeApp } from "firebase/app"
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "firebase/auth"
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp
} from "firebase/firestore"
import { format } from "date-fns"

// 🔥 CONFIG FIREBASE (COLOCA O SEU)
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "XXXX",
  appId: "XXXX"
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export default function App() {
  const [user, setUser] = useState(null)
  const [fretes, setFretes] = useState([])
  const [form, setForm] = useState({
    origem: "",
    destino: "",
    valor: "",
    peso: ""
  })
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")

  // 🔐 LOGIN
  async function login() {
    await signInWithEmailAndPassword(auth, email, senha)
  }

  // 🔁 MONITORA LOGIN
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
    })
    return () => unsub()
  }, [])

  // 📦 BUSCAR FRETES (multiempresa simples usando UID)
  useEffect(() => {
    if (!user) return

    const q = query(
      collection(db, "fretes"),
      where("empresaId", "==", user.uid)
    )

    const unsub = onSnapshot(q, (snap) => {
      setFretes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    })

    return () => unsub()
  }, [user])

  // ➕ CRIAR FRETE
  async function criarFrete() {
    await addDoc(collection(db, "fretes"), {
      ...form,
      valor: Number(form.valor),
      peso: Number(form.peso),
      empresaId: user.uid,
      status: "aberto",
      data: serverTimestamp()
    })

    setForm({ origem: "", destino: "", valor: "", peso: "" })
  }

  // 💰 CALCULO
  const total = fretes.reduce((acc, f) => acc + (f.valor || 0), 0)

  // 🔐 TELA LOGIN
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-6 rounded shadow w-80">
          <h1 className="text-xl mb-4">Login</h1>

          <input
            placeholder="Email"
            className="w-full mb-2 p-2 border"
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Senha"
            className="w-full mb-4 p-2 border"
            onChange={(e) => setSenha(e.target.value)}
          />

          <button
            onClick={login}
            className="w-full bg-green-500 text-white p-2 rounded"
          >
            Entrar
          </button>
        </div>
      </div>
    )
  }

  // 🚀 SISTEMA PRINCIPAL
  return (
    <div className="p-6 bg-gray-100 min-h-screen">

      {/* DASHBOARD */}
      <div className="mb-6 bg-white p-4 rounded shadow">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p>Total: <strong>R$ {total.toFixed(2)}</strong></p>
      </div>

      {/* FORM */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="mb-2">Novo Frete</h2>

        <input placeholder="Origem" className="border p-2 mr-2"
          value={form.origem}
          onChange={(e) => setForm({ ...form, origem: e.target.value })}
        />

        <input placeholder="Destino" className="border p-2 mr-2"
          value={form.destino}
          onChange={(e) => setForm({ ...form, destino: e.target.value })}
        />

        <input placeholder="Valor" className="border p-2 mr-2"
          value={form.valor}
          onChange={(e) => setForm({ ...form, valor: e.target.value })}
        />

        <input placeholder="Peso" className="border p-2 mr-2"
          value={form.peso}
          onChange={(e) => setForm({ ...form, peso: e.target.value })}
        />

        <button
          onClick={criarFrete}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Criar
        </button>
      </div>

      {/* LISTA */}
      <div className="bg-white p-4 rounded shadow">
        <h2>Fretes</h2>

        {fretes.map(f => (
          <div key={f.id} className="border p-2 mb-2 rounded">
            <p><strong>{f.origem} → {f.destino}</strong></p>
            <p>R$ {f.valor}</p>
            <p>{f.peso} kg</p>

            <p>
              {f.data?.seconds
                ? format(new Date(f.data.seconds * 1000), "dd/MM/yyyy")
                : "-"}
            </p>
          </div>
        ))}
      </div>

      {/* BOTÃO FLUTUANTE */}
      <button className="fixed bottom-6 right-6 bg-green-500 text-white px-6 py-3 rounded-full shadow-lg">
        +
      </button>

    </div>
  )
}