import { Navbar } from "./Navbar";
import "./App.css";
import { useState, useEffect } from "react";
import { initializeUI } from "@firebase-oss/ui-core";
import {
  FirebaseUIProvider,
  SignInAuthScreen,
  SignUpAuthScreen,
} from "@firebase-oss/ui-react";
import { app } from "./lib/firebase";
import { recaptchaVerification } from "@firebase-oss/ui-core";
import { Toast } from "./components/Toast";
import { Routes, Route, useNavigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import NewLoadForm from "./pages/loads/New";
import LoadView from "./pages/loads/Show";

const ui = initializeUI({
  app,
  behaviors: [
    recaptchaVerification({
      size: "normal",
      theme: "light",
    }),
  ],
});

function App() {
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => setToast(msg);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  const SignInPage = () => {
    const navigate = useNavigate();
    return (
      <SignInAuthScreen
        onSignIn={(user) => {
          console.log("User signed in: ", user);
          showToast("Signed in successfully");
          navigate("/");
        }}
        onSignUpClick={() => navigate("/auth/signup")}
      />
    );
  };

  const SignUpPage = () => {
    const navigate = useNavigate();
    return (
      <SignUpAuthScreen
        onSignUp={(user) => {
          console.log("User signed up: ", user);
          showToast("Account created");
          navigate("/auth/signin");
        }}
        onSignInClick={() => navigate("/auth/signin")}
      />
    );
  };

  return (
    <FirebaseUIProvider ui={ui}>
      <div className="min-h-screen bg-gray-100">
        <Navbar showToast={showToast} />
        <main className="max-w-6xl mx-auto p-6">
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="settings" element={<Settings />} />
              <Route path="loads/new" element={<NewLoadForm />} />
              <Route path="loads/:id" element={<LoadView />} />
              <Route path="loads/:id/edit" element={<LoadView edit />} />
              <Route path="loads/:id/add" element={<LoadView add />} />
            </Route>

            <Route path="/auth/signin" element={<SignInPage />} />
            <Route path="/auth/signup" element={<SignUpPage />} />
          </Routes>
        </main>
      </div>
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </FirebaseUIProvider>
  );
}

// Render toast at root of App
export function AppWithToast() {
  return (
    <>
      <App />
      {/* Toast mounted next to app root so it overlays */}
      {/* We can't directly access App's toast state from here without a context.
          Instead the simple approach is to render Toast inside App; keep this
          wrapper for future changes if needed. */}
    </>
  );
}

export default App;
