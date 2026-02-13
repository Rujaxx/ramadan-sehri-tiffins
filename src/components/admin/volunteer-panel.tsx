"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    X,
    Phone,
    MapPin,
    User,
    Loader2,
    Check,
    ChevronDown,
    ChevronUp,
    Truck,
    ToggleLeft,
    ToggleRight,
    Trash2,
    Copy,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";

interface VolunteerData {
    id: string;
    userId: string;
    name: string;
    phone: string;
    areas: string[];
    available: boolean;
    createdAt: string;
}

export function VolunteerPanel() {
    const { token } = useAuth();
    const [volunteers, setVolunteers] = useState<VolunteerData[]>([]);
    const [availableAreas, setAvailableAreas] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMoreLoading, setIsMoreLoading] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingVolunteer, setEditingVolunteer] = useState<VolunteerData | null>(null);
    const [expandedCard, setExpandedCard] = useState<string | null>(null);

    useEffect(() => {
        fetchVolunteers(true);
    }, [token]);

    const fetchVolunteers = async (isInitial = false) => {
        if (isInitial) {
            setIsLoading(true);
            setNextCursor(null);
        } else {
            setIsMoreLoading(true);
        }

        try {
            const params = new URLSearchParams();
            if (!isInitial && nextCursor) params.append("cursor", nextCursor);
            params.append("limit", "20");

            const res = await fetch(`/api/admin/volunteers?${params}`);

            if (res.ok) {
                const data = await res.json();
                if (isInitial) {
                    setVolunteers(data.volunteers);
                    setAvailableAreas(data.availableAreas || []);
                } else {
                    setVolunteers(prev => {
                        const existingIds = new Set(prev.map(v => v.id));
                        const newEntries = data.volunteers.filter((v: any) => !existingIds.has(v.id));
                        return [...prev, ...newEntries];
                    });
                }
                setNextCursor(data.nextCursor);
            }
        } catch (error) {
            console.error("Fetch volunteers error:", error);
        } finally {
            setIsLoading(false);
            setIsMoreLoading(false);
        }
    };

    const refreshData = () => fetchVolunteers(true);

    const handleToggleAvailability = async (volunteerId: string, currentStatus: boolean) => {
        try {
            const res = await fetch("/api/admin/volunteers", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    volunteerId,
                    action: "toggleAvailability",
                    available: !currentStatus
                })
            });

            if (res.ok) {
                toast.success(currentStatus ? "Marked as unavailable" : "Marked as available");
                fetchVolunteers(true);
            }
        } catch (error) {
            toast.error("An error occurred");
        }
    };

    const handleDelete = async (volunteerId: string, volunteerName: string) => {
        if (!confirm(`Remove ${volunteerName} from volunteers?`)) return;

        try {
            const res = await fetch(`/api/admin/volunteers?volunteerId=${volunteerId}`, {
                method: "DELETE"
            });

            if (res.ok) {
                toast.success("Volunteer removed");
                fetchVolunteers(true);
            }
        } catch (error) {
            toast.error("An error occurred");
        }
    };

    // Group volunteers by availability
    const activeVolunteers = volunteers.filter(v => v.available);
    const inactiveVolunteers = volunteers.filter(v => !v.available);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black">Volunteers</h2>
                    <p className="text-xs text-zinc-500">Manage delivery team</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-black font-bold rounded-xl text-sm"
                >
                    <Plus className="h-4 w-4" /> Add
                </button>
            </div>

            {/* Volunteers List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                </div>
            ) : volunteers.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                    <Truck className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No volunteers yet</p>
                    <p className="text-xs mt-1">Add volunteers to assign them to areas</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Active Volunteers */}
                    {activeVolunteers.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 px-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-xs font-bold text-zinc-500 uppercase">Active ({activeVolunteers.length})</span>
                            </div>
                            {activeVolunteers.map(volunteer => (
                                <VolunteerCard
                                    key={volunteer.id}
                                    volunteer={volunteer}
                                    availableAreas={availableAreas}
                                    isExpanded={expandedCard === volunteer.id}
                                    onToggle={() => setExpandedCard(expandedCard === volunteer.id ? null : volunteer.id)}
                                    onToggleAvailability={() => handleToggleAvailability(volunteer.id, volunteer.available)}
                                    onEdit={() => setEditingVolunteer(volunteer)}
                                    onDelete={() => handleDelete(volunteer.id, volunteer.name)}
                                    onRefresh={refreshData}
                                />
                            ))}
                        </div>
                    )}

                    {/* Inactive Volunteers */}
                    {inactiveVolunteers.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 px-2">
                                <div className="w-2 h-2 rounded-full bg-zinc-600" />
                                <span className="text-xs font-bold text-zinc-500 uppercase">Unavailable ({inactiveVolunteers.length})</span>
                            </div>
                            {inactiveVolunteers.map(volunteer => (
                                <VolunteerCard
                                    key={volunteer.id}
                                    volunteer={volunteer}
                                    availableAreas={availableAreas}
                                    isExpanded={expandedCard === volunteer.id}
                                    onToggle={() => setExpandedCard(expandedCard === volunteer.id ? null : volunteer.id)}
                                    onToggleAvailability={() => handleToggleAvailability(volunteer.id, volunteer.available)}
                                    onEdit={() => setEditingVolunteer(volunteer)}
                                    onDelete={() => handleDelete(volunteer.id, volunteer.name)}
                                    onRefresh={refreshData}
                                />
                            ))}
                        </div>
                    )}

                    {/* Infinite Scroll Load Trigger */}
                    {nextCursor && (
                        <div
                            className="h-24 flex items-center justify-center"
                            ref={(el) => {
                                if (el) {
                                    const observer = new IntersectionObserver((entries) => {
                                        if (entries[0].isIntersecting && !isMoreLoading) {
                                            fetchVolunteers();
                                            observer.unobserve(el);
                                        }
                                    }, { threshold: 0.1 });
                                    observer.observe(el);
                                }
                            }}
                        >
                            {isMoreLoading && <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />}
                        </div>
                    )}
                </div>
            )}

            {/* Add Volunteer Modal */}
            {showAddModal && (
                <AddVolunteerModal
                    areas={availableAreas}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        refreshData();
                    }}
                />
            )}
        </div>
    );
}

// Volunteer Card Component
function VolunteerCard({
    volunteer,
    availableAreas,
    isExpanded,
    onToggle,
    onToggleAvailability,
    onEdit,
    onDelete,
    onRefresh
}: {
    volunteer: VolunteerData;
    availableAreas: string[];
    isExpanded: boolean;
    onToggle: () => void;
    onToggleAvailability: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onRefresh: () => void;
}) {
    const [isUpdating, setIsUpdating] = useState(false);

    const handleAreaToggle = async (areaName: string, isAssigned: boolean) => {
        setIsUpdating(true);
        try {
            const res = await fetch("/api/admin/volunteers", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    volunteerId: volunteer.id,
                    action: isAssigned ? "unassign" : "assign",
                    areaName
                })
            });

            if (res.ok) {
                toast.success(isAssigned ? "Area removed" : "Area assigned");
                onRefresh();
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className={`rounded-2xl border transition-all ${volunteer.available
            ? "bg-zinc-900/50 border-zinc-800"
            : "bg-zinc-900/30 border-zinc-800/50 opacity-60"
            }`}>
            {/* Main Row */}
            <div
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 text-left cursor-pointer hover:bg-zinc-800/20 transition-colors"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onToggle()}
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${volunteer.available
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-zinc-700 text-zinc-500"
                        }`}>
                        <User className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-bold truncate">{volunteer.name}</div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                <span>{volunteer.phone}</span>
                            </div>
                            <CopyButton value={volunteer.phone} />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {volunteer.areas.length > 0 && (
                        <Badge className="bg-zinc-800 text-xs text-zinc-400 border-zinc-700">
                            {volunteer.areas.length} areas
                        </Badge>
                    )}
                    {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-zinc-500" />
                    ) : (
                        <ChevronDown className="h-5 w-5 text-zinc-500" />
                    )}
                </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-zinc-800/50 pt-3">
                    {/* Area Assignments */}
                    <div>
                        <p className="text-xs font-bold text-zinc-500 uppercase mb-2">Assigned Areas</p>
                        <div className="flex flex-wrap gap-2">
                            {availableAreas.map(area => {
                                const isAssigned = volunteer.areas.includes(area);
                                return (
                                    <button
                                        key={area}
                                        onClick={() => handleAreaToggle(area, isAssigned)}
                                        disabled={isUpdating}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${isAssigned
                                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                            : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                                            } disabled:opacity-50`}
                                    >
                                        {isAssigned && <Check className="h-3 w-3 inline mr-1" />}
                                        {area}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={onToggleAvailability}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold ${volunteer.available
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-emerald-500/20 text-emerald-400"
                                }`}
                        >
                            {volunteer.available ? (
                                <>
                                    <ToggleRight className="h-4 w-4" /> Set Unavailable
                                </>
                            ) : (
                                <>
                                    <ToggleLeft className="h-4 w-4" /> Set Available
                                </>
                            )}
                        </button>
                        <button
                            onClick={onDelete}
                            className="px-4 py-2.5 bg-red-500/20 text-red-400 rounded-xl"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function CopyButton({ value }: { value: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card from toggling
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-600 hover:text-zinc-400"
            title="Copy to clipboard"
        >
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
        </button>
    );
}

// Add Volunteer Modal
function AddVolunteerModal({
    areas,
    onClose,
    onSuccess
}: {
    areas: string[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [phone, setPhone] = useState("");
    const [name, setName] = useState("");
    const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!phone) {
            toast.error("Phone number required");
            return;
        }

        if (phone.length !== 10 || !/^\d+$/.test(phone)) {
            toast.error("Please enter a valid 10-digit phone number");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/admin/volunteers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ phone, name: name || undefined, areas: selectedAreas })
            });

            if (res.ok) {
                toast.success("Volunteer added successfully");
                onSuccess();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to add volunteer");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleArea = (area: string) => {
        setSelectedAreas(prev =>
            prev.includes(area)
                ? prev.filter(a => a !== area)
                : [...prev, area]
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
            <div className="w-full sm:max-w-md bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-zinc-950 p-4 border-b border-zinc-800 flex items-center justify-between">
                    <h3 className="text-lg font-black">Add Volunteer</h3>
                    <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <p className="text-xs text-emerald-400">
                            💡 If the phone number belongs to an existing user, they will be promoted to volunteer.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Phone *</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                                setPhone(val);
                            }}
                            maxLength={10}
                            placeholder="10-digit phone number"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Name (for new users)</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Full name"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Assign Areas</label>
                        <div className="flex flex-wrap gap-2">
                            {areas.map(area => (
                                <button
                                    key={area}
                                    onClick={() => toggleArea(area)}
                                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${selectedAreas.includes(area)
                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                        : "bg-zinc-800 text-zinc-400"
                                        }`}
                                >
                                    {selectedAreas.includes(area) && <Check className="h-3 w-3 inline mr-1" />}
                                    {area}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="sticky bottom-0 bg-zinc-950 p-4 border-t border-zinc-800">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full py-4 bg-emerald-500 text-black font-black rounded-2xl disabled:opacity-50"
                    >
                        {isSubmitting ? "Adding..." : "Add Volunteer"}
                    </button>
                </div>
            </div>
        </div>
    );
}
