import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-0">
      <SignIn
        appearance={{
          variables: { colorPrimary: "#7F77DD", colorBackground: "#1a1a18", colorText: "#f0efe9" },
        }}
      />
    </div>
  );
}
