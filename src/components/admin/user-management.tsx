"use client";

import { useState, useEffect } from "react";
import {
    Search,
    UserX,
    UserCheck,
    Edit2,
    ShieldAlert,
    SearchX,
    Loader2,
    Utensils,
    Phone,
    MapPin,
    Check,
    X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface User {
    id: string;
    name: string;
    phone: string;
    alternatePhone?: string | null;
    area: string;
    address: string;
    landmark?: string | null;
    pin: string;
    blocked: boolean;
    verified: boolean;
    bookings: {
        tiffinCount: number;
    }[];
}

export function UserManagement({ defaultFilter }: { defaultFilter?: boolean | null }) {
    const [query, setQuery] = useState("");
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editForm, setEditForm] = useState<Partial<User>>({});
    const [newTiffinCount, setNewTiffinCount] = useState<number>(0);
    const [isUpdating, setIsUpdating] = useState(false);
    const [filterVerified, setFilterVerified] = useState<boolean | null>(null);

    useEffect(() => {
        if (defaultFilter !== undefined) {
            setFilterVerified(defaultFilter);
        }
        fetchUsers();
    }, [defaultFilter]);

    // Fetch users when query changes
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers();
        }, 500);
        return () => clearTimeout(timer);
    }, [query]);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/users?query=${query}`);
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users);
            }
        } catch (error) {
            toast.error("Failed to fetch users");
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleBlock = async (user: User) => {
        const action = user.blocked ? "unblock" : "block";
        if (!confirm(`Are you sure you want to ${action} ${user.name}?`)) return;

        try {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ userId: user.id, blocked: !user.blocked })
            });

            if (res.ok) {
                toast.success(`User ${action}ed successfully`);
                fetchUsers();
            } else {
                toast.error("Failed to update user status");
            }
        } catch (error) {
            toast.error("An error occurred");
        }
    };

    const handleVerify = async (user: User) => {
        try {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ userId: user.id, verified: true })
            });

            if (res.ok) {
                toast.success(`${user.name} verified successfully`);
                fetchUsers();
            } else {
                toast.error("Failed to verify user");
            }
        } catch (error) {
            toast.error("An error occurred");
        }
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;
        setIsUpdating(true);

        // Validate phone
        if (editForm.phone && (editForm.phone.length !== 10 || !/^\d{10}$/.test(editForm.phone))) {
            toast.error("Phone number must be exactly 10 digits");
            setIsUpdating(false);
            return;
        }

        // Validate alternate phone
        if (editForm.alternatePhone && !/^\d{10}$/.test(editForm.alternatePhone)) {
            toast.error("Alternate phone must be exactly 10 digits");
            setIsUpdating(false);
            return;
        }

        // Validate PIN if provided
        if (editForm.pin && (editForm.pin.length !== 4 || !/^\d+$/.test(editForm.pin))) {
            toast.error("PIN must be exactly 4 digits");
            setIsUpdating(false);
            return;
        }


        try {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    userId: editingUser.id,
                    tiffinCount: newTiffinCount,
                    ...editForm
                })
            });

            if (res.ok) {
                toast.success("User details updated");
                setEditingUser(null);
                fetchUsers();
            } else {
                toast.error("Failed to update user");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <>
            <Card className="glass border-white/5 rounded-[2rem] sm:rounded-3xl overflow-hidden">
                <CardHeader className="p-4 sm:p-6 pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl sm:text-2xl font-black gradient-text flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5 sm:h-6 sm:h-6 text-amber-400" />
                                User Control Center
                            </CardTitle>
                            <CardDescription className="text-[9px] sm:text-[10px] leading-tight mb-2">
                                Search, edit details, adjust tiffin counts, or block numbers instantly.
                            </CardDescription>
                            <div className="p-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 mb-2">
                                <p className="text-[9px] sm:text-[10px] text-emerald-400 font-bold leading-snug">
                                    💡 TIP: Editing details here affects the core user profile.
                                    Tiffin changes update the primary "Base Plan".
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 sm:mt-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Find name or phone..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 sm:py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium"
                            />
                        </div>
                        <select
                            value={filterVerified === null ? "all" : filterVerified.toString()}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFilterVerified(val === "all" ? null : val === "true");
                            }}
                            className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 sm:py-3.5 text-sm font-bold text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none"
                        >
                            <option value="all">Priority: All Users</option>
                            <option value="false">Action: Pending Verification</option>
                            <option value="true">State: Verified Only</option>
                        </select>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="overflow-x-auto custom-scrollbar">
                        <Table>
                            <TableHeader className="bg-white/5">
                                <TableRow className="hover:bg-transparent border-white/5">
                                    <TableHead className="font-bold py-4 text-xs uppercase tracking-wider">User Details</TableHead>
                                    <TableHead className="font-bold py-4 text-xs uppercase tracking-wider hidden sm:table-cell">Area & Location</TableHead>
                                    <TableHead className="font-bold py-4 text-center text-xs uppercase tracking-wider">Service</TableHead>
                                    <TableHead className="font-bold py-4 text-center text-xs uppercase tracking-wider">Security</TableHead>
                                    <TableHead className="font-bold py-4 text-right text-xs uppercase tracking-wider">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-64 text-center">
                                            <Loader2 className="h-10 w-10 animate-spin mx-auto text-emerald-500 mb-4" />
                                            <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Accessing Database...</p>
                                        </TableCell>
                                    </TableRow>
                                ) : users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-64 text-center">
                                            <div className="bg-zinc-900/50 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                                                <SearchX className="h-8 w-8 text-zinc-700" />
                                            </div>
                                            <p className="text-zinc-500 font-bold">No results for "{query}"</p>
                                            <p className="text-[10px] text-zinc-600 mt-1 uppercase tracking-wider">Try searching by mobile number</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users
                                        .filter(user => filterVerified === null || user.verified === filterVerified)
                                        .map((user) => (
                                            <TableRow key={user.id} className="hover:bg-white/5 border-white/5 group transition-colors">
                                                <TableCell className="py-4 sm:py-5">
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-white text-sm sm:text-base line-clamp-1">{user.name}</span>
                                                        <div className="flex flex-col gap-0.5 mt-1">
                                                            <a href={`tel:${user.phone}`} className="text-[11px] sm:text-xs text-emerald-400 font-black flex items-center gap-1 hover:underline">
                                                                <Phone className="h-3 w-3" />
                                                                {user.phone}
                                                            </a>
                                                            <span className="text-[9px] sm:text-[10px] text-zinc-500 font-bold sm:hidden">{user.area}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden sm:table-cell">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1.5 text-zinc-200">
                                                            <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                                                            <span className="text-sm font-black uppercase tracking-tight">{user.area}</span>
                                                        </div>
                                                        <span className="text-[10px] text-zinc-500 font-medium line-clamp-1 max-w-[200px]">{user.address}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="inline-flex flex-col items-center">
                                                        <div className="flex items-center gap-1.5 sm:gap-2 bg-zinc-900 border border-zinc-800 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-sm sm:text-base font-black text-white">
                                                            <Utensils className="h-3.5 w-3.5 sm:h-4 sm:h-4 text-emerald-500" />
                                                            {user.bookings[0]?.tiffinCount || 0}
                                                        </div>
                                                        <span className="text-[7px] sm:text-[8px] font-black text-zinc-600 uppercase mt-1 tracking-widest">Units</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        {user.blocked ? (
                                                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 rounded-lg font-black text-[8px] sm:text-[9px] px-1.5 sm:px-2 py-0.5">
                                                                BLOCKED
                                                            </Badge>
                                                        ) : user.verified ? (
                                                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 rounded-lg font-black text-[8px] sm:text-[9px] px-1.5 sm:px-2 py-0.5">
                                                                VERIFIED
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 rounded-lg font-black text-[8px] sm:text-[9px] px-1.5 sm:px-2 py-0.5">
                                                                PENDING
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1.5 sm:gap-2 px-1 sm:px-2 text-[10px]">
                                                        {!user.verified && !user.blocked && (
                                                            <button
                                                                onClick={() => handleVerify(user)}
                                                                className="h-9 sm:h-10 px-2 sm:px-4 rounded-lg sm:rounded-xl bg-emerald-500 text-black font-black flex items-center gap-1 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                                                                title="Verify"
                                                            >
                                                                <Check className="h-3.5 w-3.5" /> <span className="hidden xs:inline">VERIFY</span>
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                setEditingUser(user);
                                                                setNewTiffinCount(user.bookings[0]?.tiffinCount || 0);
                                                                setEditForm({
                                                                    name: user.name,
                                                                    phone: user.phone,
                                                                    alternatePhone: user.alternatePhone,
                                                                    area: user.area,
                                                                    address: user.address,
                                                                    landmark: user.landmark,
                                                                    pin: "" // Don't show the hashed PIN, allow setting a new one
                                                                });
                                                            }}
                                                            className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-lg sm:rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleBlock(user)}
                                                            className={`h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-lg sm:rounded-xl border transition-all ${user.blocked
                                                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                                : "bg-red-500/10 border-red-500/20 text-red-400"
                                                                }`}
                                                            title={user.blocked ? "Unblock" : "Block"}
                                                        >
                                                            {user.blocked ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                                                        </button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Advanced Edit Modal - Matches Bookings Edit Design */}
            {editingUser && (
                <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-300">
                    <div className="w-full sm:max-w-md bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl relative">
                        {/* Decorative background glow (subtle) */}
                        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/5 blur-[100px] pointer-events-none" />
                        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/5 blur-[100px] pointer-events-none" />

                        {/* Top Bar / Header */}
                        <div className="sticky top-0 bg-zinc-950/80 backdrop-blur-md p-4 border-b border-zinc-800 flex items-center justify-between z-20">
                            {/* Mobile Drag Handle */}
                            <div className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-zinc-800 rounded-full" />
                            <div className="mt-2 sm:mt-0">
                                <h3 className="text-lg font-black text-white">Edit Profile</h3>
                                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{editingUser.name}</p>
                            </div>
                            <button
                                onClick={() => setEditingUser(null)}
                                className="h-10 w-10 flex items-center justify-center text-zinc-500 hover:text-white mt-2 sm:mt-0"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Scrollable Content Area */}
                        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                            <style jsx>{`
                                .custom-scrollbar::-webkit-scrollbar {
                                    width: 4px;
                                }
                                .custom-scrollbar::-webkit-scrollbar-track {
                                    background: transparent;
                                }
                                .custom-scrollbar::-webkit-scrollbar-thumb {
                                    background: rgba(255, 255, 255, 0.1);
                                    border-radius: 10px;
                                }
                            `}</style>

                            {/* Section: Identity */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-1 w-4 bg-emerald-500 rounded-full" />
                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Identity</h4>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-zinc-500 ml-1 uppercase">Name</label>
                                        <input
                                            type="text"
                                            value={editForm.name || ""}
                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                            className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-zinc-500 ml-1 uppercase">Phone</label>
                                            <input
                                                type="text"
                                                value={editForm.phone || ""}
                                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                                className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all font-mono"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-zinc-500 ml-1 uppercase">Alt Phone</label>
                                            <input
                                                type="text"
                                                value={editForm.alternatePhone || ""}
                                                onChange={(e) => setEditForm({ ...editForm, alternatePhone: e.target.value })}
                                                className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all font-mono"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-zinc-500 ml-1 uppercase">Area</label>
                                        <input
                                            type="text"
                                            value={editForm.area || ""}
                                            onChange={(e) => setEditForm({ ...editForm, area: e.target.value })}
                                            className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section: Logistics */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-1 w-4 bg-cyan-500 rounded-full" />
                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Logistics</h4>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-zinc-500 ml-1 uppercase">Full Address</label>
                                        <textarea
                                            value={editForm.address || ""}
                                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                            rows={2}
                                            className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-cyan-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all resize-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-zinc-500 ml-1 uppercase">Landmark</label>
                                            <input
                                                type="text"
                                                value={editForm.landmark || ""}
                                                onChange={(e) => setEditForm({ ...editForm, landmark: e.target.value })}
                                                className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-cyan-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-zinc-500 ml-1 uppercase">New Login PIN</label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                maxLength={4}
                                                value={editForm.pin || ""}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, "");
                                                    setEditForm({ ...editForm, pin: val });
                                                }}
                                                placeholder="4-digit code"
                                                className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-cyan-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all font-mono placeholder:text-[10px]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Service */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-1 w-4 bg-amber-500 rounded-full" />
                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Service</h4>
                                </div>
                                <div className="p-4 py-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/50 flex flex-col items-center justify-center gap-4">
                                    <div className="text-center">
                                        <p className="text-sm font-black text-white">Base Subscription</p>
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Daily Tiffin Units</p>
                                    </div>

                                    <div className="flex items-center gap-8">
                                        <button
                                            onClick={() => setNewTiffinCount(Math.max(1, newTiffinCount - 1))}
                                            className="w-14 h-14 rounded-2xl bg-zinc-800 text-2xl font-bold hover:bg-zinc-700 active:scale-95 transition-all text-white"
                                        >
                                            -
                                        </button>
                                        <div className="flex flex-col items-center">
                                            <span className="text-5xl font-black text-white tabular-nums">{newTiffinCount}</span>
                                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest -mt-1">Units</span>
                                        </div>
                                        <button
                                            onClick={() => setNewTiffinCount(newTiffinCount + 1)}
                                            className="w-14 h-14 rounded-2xl bg-zinc-800 text-2xl font-bold hover:bg-zinc-700 active:scale-95 transition-all text-white"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sticky Bottom Actions */}
                        <div className="sticky bottom-0 bg-zinc-950 p-4 border-t border-zinc-800 flex gap-3 z-20">
                            <button
                                onClick={() => setEditingUser(null)}
                                className="flex-1 py-4 bg-zinc-900 text-zinc-400 font-bold rounded-2xl hover:text-white transition-colors text-xs uppercase tracking-widest"
                            >
                                Discard
                            </button>
                            <button
                                onClick={handleUpdateUser}
                                disabled={isUpdating}
                                className="flex-[1.5] py-4 bg-emerald-500 text-black font-black rounded-2xl disabled:opacity-50 hover:bg-emerald-400 transition-colors text-xs uppercase tracking-widest"
                            >
                                {isUpdating ? "Saving..." : "Commit"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
