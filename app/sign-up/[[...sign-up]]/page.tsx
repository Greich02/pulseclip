import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-0">
      <SignUp
        appearance={{
          variables: { colorPrimary: "#7F77DD", colorBackground: "#1a1a18", colorText: "#f0efe9" },
        }}
      />
    </div>
  );
}
