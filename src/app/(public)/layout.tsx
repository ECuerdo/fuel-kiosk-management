// src/app/(public)/layout.tsx

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-dvh bg-background text-foreground">
            <main className="min-h-dvh">{children}</main>
        </div>
    )
}
