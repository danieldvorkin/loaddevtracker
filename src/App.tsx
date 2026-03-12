import { Navbar } from "./Navbar";
import "./App.css";

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </main>
    </div>
  );
}

export default App;
