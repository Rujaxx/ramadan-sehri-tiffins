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
    X,
    ChevronDown,
    Copy,
    MoreVertical,
    Calendar,
    Trash2
} from "lucide-react";
import { format } from "date-fns";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { RAMADAN_AREAS } from "@/lib/constants";
import { maskPhone } from "@/lib/utils";

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
        startDate: string;
        endDate: string;
    }[];
}

export function UserManagement({ defaultFilter }: { defaultFilter?: boolean | null }) {
    const [query, setQuery] = useState("");
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isMoreLoading, setIsMoreLoading] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editForm, setEditForm] = useState<Partial<User>>({});
    const [newTiffinCount, setNewTiffinCount] = useState<number>(0);
    const [isUpdating, setIsUpdating] = useState(false);
    const [filterVerified, setFilterVerified] = useState<boolean | null>(null);
    const [revealedUsers, setRevealedUsers] = useState<Set<string>>(new Set());

    const toggleReveal = (userId: string) => {
        const next = new Set(revealedUsers);
        if (next.has(userId)) next.delete(userId);
        else next.add(userId);
        setRevealedUsers(next);
    };

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

    const fetchUsers = async (isInitial = true) => {
        if (isInitial) {
            setIsLoading(true);
            setNextCursor(null);
        } else {
            setIsMoreLoading(true);
        }

        try {
            const params = new URLSearchParams();
            if (query) params.append("query", query);
            if (!isInitial && nextCursor) params.append("cursor", nextCursor);
            params.append("limit", "20");

            const res = await fetch(`/api/admin/users?${params}`);
            if (res.ok) {
                const data = await res.json();
                if (isInitial) {
                    setUsers(data.users);
                } else {
                    setUsers(prev => {
                        const existingIds = new Set(prev.map(u => u.id));
                        const newEntries = data.users.filter((u: any) => !existingIds.has(u.id));
                        return [...prev, ...newEntries];
                    });
                }
                setNextCursor(data.nextCursor);
            }
        } catch (error) {
            toast.error("Failed to fetch users");
        } finally {
            setIsLoading(false);
            setIsMoreLoading(false);
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

    const handleDeleteUser = async (user: User) => {
        if (!confirm(`CRITICAL: Are you sure you want to PERMANENTLY DELETE ${user.name}? This will remove all their data, including past bookings. This cannot be undone.`)) return;

        try {
            const res = await fetch(`/api/admin/users?userId=${user.id}`, {
                method: "DELETE"
            });

            if (res.ok) {
                toast.success("User deleted successfully");
                fetchUsers();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to delete user");
            }
        } catch (error) {
            toast.error("An error occurred");
        }
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;

        // Mandatory validations
        if (!editForm.name?.trim()) {
            toast.error("Full name is mandatory");
            return;
        }
        if (!editForm.phone?.trim()) {
            toast.error("Phone number is mandatory");
            return;
        }
        if (!editForm.address?.trim()) {
            toast.error("Address is mandatory");
            return;
        }

        setIsUpdating(true);

        // Validate phone length and pattern
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
                    <div className="flex flex-col">
                        {isLoading ? (
                            <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
                                <Loader2 className="h-10 w-10 animate-spin mb-4 text-emerald-500" />
                                <p className="text-[10px] uppercase font-black tracking-[0.2em]">Synchronizing</p>
                            </div>
                        ) : users.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center text-center px-6">
                                <div className="bg-zinc-900/50 w-16 h-16 rounded-3xl flex items-center justify-center mb-4 border border-zinc-800">
                                    <SearchX className="h-8 w-8 text-zinc-700" />
                                </div>
                                <p className="text-zinc-500 font-black">NO MATCHES FOUND</p>
                                <p className="text-[10px] text-zinc-600 mt-2 uppercase tracking-wide">Try a different name or number</p>
                            </div>
                        ) : (
                            <div className="flex flex-col divide-y divide-white/5 max-w-5xl mx-auto w-full">
                                {users
                                    .filter(user => filterVerified === null || user.verified === filterVerified)
                                    .map((user) => (
                                        <div key={user.id} className="relative px-4 py-3 sm:pl-6 sm:pr-12 sm:py-4 hover:bg-white/[0.02] transition-all group">
                                            {/* Action Dropdown - Top Right Corner */}
                                            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-30">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-colors">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48 bg-zinc-900 border-zinc-800 text-zinc-300">
                                                        <DropdownMenuItem
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
                                                                    pin: ""
                                                                });
                                                            }}
                                                            className="flex items-center gap-2 focus:bg-emerald-500/10 focus:text-emerald-400 cursor-pointer py-2.5"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                            <span className="font-bold text-xs uppercase tracking-widest">Edit Details</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleToggleBlock(user)}
                                                            className={`flex items-center gap-2 focus:bg-red-500/10 cursor-pointer py-2.5 ${user.blocked ? "text-emerald-400 focus:text-emerald-400" : "text-red-400 focus:text-red-400"}`}
                                                        >
                                                            {user.blocked ? (
                                                                <>
                                                                    <UserCheck className="h-4 w-4" />
                                                                    <span className="font-bold text-xs uppercase tracking-widest">Unblock User</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <UserX className="h-4 w-4" />
                                                                    <span className="font-bold text-xs uppercase tracking-widest">Block User</span>
                                                                </>
                                                            )}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleDeleteUser(user)}
                                                            className="flex items-center gap-2 focus:bg-red-500/10 text-red-400 focus:text-red-400 cursor-pointer py-2.5"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            <span className="font-bold text-xs uppercase tracking-widest">Permanently Delete</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-x-6 gap-y-3">

                                                {/* TOP LEFT: Identity & Location */}
                                                <div className="space-y-2 flex-1 min-w-0">
                                                    <div className="flex items-center gap-3">
                                                        <h4 className="font-black text-white text-lg tracking-tight leading-none truncate group-hover:text-emerald-400 transition-colors">
                                                            {user.name}
                                                        </h4>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <div className="bg-emerald-500/10 p-0.5 rounded border border-emerald-500/20">
                                                                <MapPin className="h-3 w-3 text-emerald-500" />
                                                            </div>
                                                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">{user.area}</span>
                                                        </div>
                                                    </div>
                                                    <div className="pl-4 space-y-0.5 border-l border-zinc-800 ml-[5px]">
                                                        <p className="text-[11px] text-zinc-500 font-medium leading-relaxed break-words">
                                                            {user.address}
                                                        </p>
                                                        {user.landmark && (
                                                            <p className="text-[9px] text-emerald-500/50 font-black uppercase tracking-tighter flex items-center gap-1.5 transition-opacity group-hover:opacity-100 opacity-60">
                                                                Near: {user.landmark}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* TOP RIGHT: Global Stats & Status */}
                                                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                                                    {user.bookings[0] && (
                                                        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-lg">
                                                            <Calendar className="h-3.5 w-3.5 text-amber-500" />
                                                            <span className="text-[10px] font-black text-amber-500/90 leading-none">
                                                                {format(new Date(user.bookings[0].startDate), "dd MMM")} - {format(new Date(user.bookings[0].endDate), "dd MMM")}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-lg">
                                                        <Utensils className="h-3.5 w-3.5 text-emerald-500" />
                                                        <span className="text-base font-black text-white leading-none">{user.bookings[0]?.tiffinCount || 0}</span>
                                                        <span className="text-[7px] font-black text-zinc-600 uppercase tracking-tighter">Units</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        {user.blocked ? (
                                                            <div className="bg-red-500/10 text-red-500 text-[8px] font-black px-2 py-0.5 rounded border border-red-500/20 uppercase tracking-tighter">Blocked</div>
                                                        ) : user.verified ? (
                                                            <div className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-tighter">Verified</div>
                                                        ) : (
                                                            <div className="flex items-center gap-1">
                                                                <div className="bg-amber-500/10 text-amber-500 text-[8px] font-black px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-tighter animate-pulse">Pending</div>
                                                                <button
                                                                    onClick={() => handleVerify(user)}
                                                                    className="h-6 w-6 flex items-center justify-center rounded-md bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all hover:bg-emerald-400"
                                                                    title="Verify User"
                                                                >
                                                                    <Check className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* BOTTOM LEFT: Contact Cards */}
                                                <div className="flex flex-col sm:flex-row gap-2 w-full max-w-2xl">
                                                    <div className="flex-1 min-w-0 flex items-center justify-between bg-zinc-900/30 p-2 rounded-xl border border-white/5 hover:border-emerald-500/20 transition-all group/phone relative">
                                                        <div className="flex items-center gap-2.5">
                                                            <a
                                                                href={`tel:${user.phone}`}
                                                                className="h-8 w-8 flex items-center justify-center rounded-lg bg-emerald-500 text-black shadow-lg shadow-emerald-500/10 active:scale-90 transition-all"
                                                            >
                                                                <Phone className="h-3.5 w-3.5" />
                                                            </a>
                                                            <div className="flex flex-col">
                                                                <span
                                                                    onClick={() => toggleReveal(user.id)}
                                                                    className="text-xs text-emerald-400 font-black tracking-tight cursor-pointer"
                                                                >
                                                                    {revealedUsers.has(user.id) ? user.phone : maskPhone(user.phone)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <CopyButton value={user.phone} />
                                                    </div>

                                                    {user.alternatePhone && (
                                                        <div className="flex-1 min-w-0 flex items-center justify-between bg-zinc-900/30 p-2 rounded-xl border border-white/5 opacity-70 hover:opacity-100 transition-all relative">
                                                            <div className="flex items-center gap-2.5">
                                                                <a
                                                                    href={`tel:${user.alternatePhone}`}
                                                                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 active:scale-90 transition-all"
                                                                >
                                                                    <Phone className="h-3.5 w-3.5" />
                                                                </a>
                                                                <div className="flex flex-col">
                                                                    <span
                                                                        onClick={() => toggleReveal(user.id)}
                                                                        className="text-xs text-zinc-400 font-black tracking-tight cursor-pointer"
                                                                    >
                                                                        {revealedUsers.has(user.id) ? user.alternatePhone : maskPhone(user.alternatePhone)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <CopyButton value={user.alternatePhone} />
                                                        </div>
                                                    )}
                                                </div>

                                            </div>
                                        </div>
                                    ))}

                                {/* Infinite Scroll Load Trigger */}
                                {nextCursor && (
                                    <div
                                        className="h-24 flex items-center justify-center p-4"
                                        ref={(el) => {
                                            if (!el) return;
                                            const observer = new IntersectionObserver((entries) => {
                                                if (entries[0].isIntersecting && !isMoreLoading && nextCursor) {
                                                    fetchUsers(false);
                                                }
                                            }, { threshold: 0.1 });
                                            observer.observe(el);
                                            return () => observer.disconnect();
                                        }}
                                    >
                                        {isMoreLoading && <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Advanced Edit Modal - Matches Bookings Edit Design */}
            {
                editingUser && (
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
                                            <label className="text-[9px] font-bold text-zinc-500 ml-1 uppercase">Name *</label>
                                            <input
                                                type="text"
                                                value={editForm.name || ""}
                                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-bold text-zinc-500 ml-1 uppercase">Phone *</label>
                                                <input
                                                    type="text"
                                                    value={editForm.phone || ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                                                        setEditForm({ ...editForm, phone: val });
                                                    }}
                                                    className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all font-mono"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-bold text-zinc-500 ml-1 uppercase">Alt Phone</label>
                                                <input
                                                    type="text"
                                                    value={editForm.alternatePhone || ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                                                        setEditForm({ ...editForm, alternatePhone: val });
                                                    }}
                                                    className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-zinc-500 ml-1 uppercase">Area *</label>
                                            <div className="relative">
                                                <select
                                                    value={editForm.area || ""}
                                                    onChange={(e) => setEditForm({ ...editForm, area: e.target.value })}
                                                    className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all appearance-none"
                                                >
                                                    <option value="" disabled>Select Area</option>
                                                    {RAMADAN_AREAS.map((area) => (
                                                        <option key={area} value={area}>{area}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                                                    <ChevronDown className="h-4 w-4" />
                                                </div>
                                            </div>
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
                                            <label className="text-[9px] font-bold text-zinc-500 ml-1 uppercase">Full Address *</label>
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
                )
            }
        </>
    );
}

function CopyButton({ value }: { value: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="p-1 hover:bg-white/10 rounded transition-colors text-zinc-600 hover:text-zinc-400"
            title="Copy to clipboard"
        >
            {copied ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
        </button>
    );
}
