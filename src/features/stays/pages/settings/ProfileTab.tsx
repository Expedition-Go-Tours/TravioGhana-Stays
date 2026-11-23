import { useEffect, useRef, useState } from "react";

import { User, Loader2, Upload, Trash2, X, Building2, Globe, MapPin, Clock, Phone, Save, IdCard, ShieldCheck } from "@/features/stays/icons";
import { toast } from "sonner";
import PhoneInput from "@/components/forms/PhoneInput";
import { motion } from "framer-motion";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import OptimizedImage from "@/components/shared/OptimizedImage";
import { fetchCurrentUser, updateCurrentUser, uploadSupplierLogo, fetchBusinessProfile, updateBusinessProfile } from "../../settingsApi";
import { getAuthToken, useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

import { config } from "@/config";

import SocialMediaManager from "@/features/settings/components/SocialMediaManager";
import OperatingHoursEditor from "@/features/settings/components/OperatingHoursEditor";
import { emptyWeeklyHours, normalizeWeeklyHours, validateOperatingHours } from "@/features/settings/utils/operatingHours";

import { GHANA_REGIONS } from "@/features/settings/utils/regions";
import { isIndividualSupplier } from "@/features/settings/utils/supplierKind";

import { maskId, FADE_UP } from "./constants";
import { LoadingSkeleton } from "./widgets";
import { SaveBar } from "./SaveBar";
function ProfileTab() {
  const authUser = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", phone: "", language: "en", timezone: "UTC", email: "",
    brandName: "", description: "", address: "", city: "", country: "", region: "",
    legalBusinessName: "", businessType: "", registrationNumber: "", tin: "", yearEstablished: "",
    website: "", operatingHours: emptyWeeklyHours(),
    instagram: "", facebook: "", twitter: "",
    tiktok: "", youtube: "", linkedin: "", whatsapp: "", pinterest: "",
  });
  const [initialForm, setInitialForm] = useState<any>(null);
  const [operatingRegions, setOperatingRegions] = useState([]);
  const [initialOperatingRegions, setInitialOperatingRegions] = useState([]);
  const [operatingMeta, setOperatingMeta] = useState({ services: [], tourCategories: [] });
  const [representativeInfo, setRepresentativeInfo] = useState({
    fullName: "", email: "", phoneNumber: "", dateOfBirth: "", idType: "", idNumber: "",
  });
  const [supplierType, setSupplierType] = useState<any>(null);
  const [supplierChoice, setSupplierChoice] = useState<any>(null);
  const isIndividual = isIndividualSupplier({ supplierType, supplierChoice }) === true;
  const [logoFile, setLogoFile] = useState<any>(null);
  const [logoPreview, setLogoPreview] = useState<any>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<any>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [hoursErrors, setHoursErrors] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function load() {
      if (!getAuthToken()) { setLoading(false); return; }
      try {
        const [user, biz] = await Promise.all([
          fetchCurrentUser(),
          fetchBusinessProfile(),
        ]);
        if (user) {
          const bi: any = biz?.businessInfo || {};
          const oi = biz?.operatingInfo || {};
          const ri = biz?.representativeInfo || {};
          const cached: any = useAuthStore.getState().supplierProfile;
          // The application writes the address as { line1, city, state, ... };
          // some legacy rows kept a flat string. Normalise either into the
          // form so what the supplier submitted comes back into the inputs.
          const addr =
            bi.address && typeof bi.address === "object" && !Array.isArray(bi.address)
              ? bi.address
              : typeof bi.address === "string"
                ? { line1: bi.address }
                : {};
          setSupplierType(biz?.supplierType || cached?.supplierType || null);
          setSupplierChoice(bi?.supplierChoice || cached?.businessInfo?.supplierChoice || null);
          const loaded = {
            name: user.name || "", phone: user.phone || bi.phoneNumber || "",
            language: user.language || "en", timezone: user.timezone || "UTC",
            email: user.email || "",
            brandName: bi.displayName || (typeof bi.businessName === "string" ? bi.businessName : "") || "",
            description: bi.description || "",
            address: addr.line1 || "",
            city: addr.city || bi.city || "",
            country: bi.country || "",
            region: addr.state || bi.region || "",
            website: bi.website || "",
            legalBusinessName: bi.legalBusinessName || "",
            businessType: bi.businessType || "",
            registrationNumber: bi.registrationNumber || "",
            tin: bi.tin || "",
            yearEstablished: bi.yearEstablished != null ? String(bi.yearEstablished) : "",
            instagram: bi.instagram || "", facebook: bi.facebook || "",
            twitter: bi.twitter || "", operatingHours: normalizeWeeklyHours(bi.operatingHours),
            tiktok: bi.tiktok || "", youtube: bi.youtube || "",
            linkedin: bi.linkedin || "", whatsapp: bi.whatsapp || "",
            pinterest: bi.pinterest || "",
          };
          setForm(loaded);
          setInitialForm(loaded);
          setOperatingRegions(Array.isArray(oi.regions) ? oi.regions : []);
          setInitialOperatingRegions(Array.isArray(oi.regions) ? [...oi.regions] : []);
          setOperatingMeta({
            services: Array.isArray(oi.services) ? oi.services : [],
            tourCategories: Array.isArray(oi.tourCategories) ? oi.tourCategories : [],
          });
          setRepresentativeInfo({
            fullName: ri.fullName || user.name || "",
            email: ri.email || user.email || "",
            phoneNumber: ri.phoneNumber || user.phone || "",
            dateOfBirth: ri.dateOfBirth || "",
            idType: ri.idType || "",
            idNumber: ri.idNumber || "",
          });
          setCurrentLogoUrl(user.logoUrl || null);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const handleSavePersonal = async (e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.();
    setSaving(true);
    try {
      await updateCurrentUser({ name: form.name, phone: form.phone, language: form.language, timezone: form.timezone });
      const user = await fetchCurrentUser();
      if (user) useAuthStore.getState().updateUser(user);
      toast.success("Personal info updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update personal info");
    } finally { setSaving(false); }
  };

  const handleSaveBusiness = async () => {
    // Operating regions are required in the application form ("Select at
    // least one region") — the settings page must not let them save blank.
    if (operatingRegions.length === 0) {
      toast.error("Select at least one region you operate in");
      return;
    }
    // The schedule is optional, but a range that ends before it starts must not
    // be stored — surface it on the offending day instead of saving junk.
    const errorsFound = validateOperatingHours(form.operatingHours);
    if (Object.keys(errorsFound).length > 0) {
      setHoursErrors(errorsFound);
      toast.error("Fix your operating hours before saving");
      return;
    }
    setHoursErrors({});
    setSaving(true);
    try {
      await updateBusinessProfile({
        businessInfo: {
          // displayName is the "Business / Brand name" the application
          // collects from everyone, including individual tour guides.
          displayName: form.brandName,
          legalBusinessName: form.legalBusinessName,
          businessType: form.businessType,
          registrationNumber: form.registrationNumber,
          tin: form.tin,
          yearEstablished: form.yearEstablished,
          description: form.description,
          // The application stores the address as a nested object
          // { line1, city, state, ... }. Keep that shape — writing a flat
          // string here corrupts the public profile and re-validation.
          address: { line1: form.address, line2: "", city: form.city, state: form.region, postalCode: "" },
          country: form.country,
          website: form.website,
          operatingHours: form.operatingHours,
          instagram: form.instagram, facebook: form.facebook, twitter: form.twitter,
          tiktok: form.tiktok, youtube: form.youtube, linkedin: form.linkedin,
          whatsapp: form.whatsapp, pinterest: form.pinterest,
        },
        operatingInfo: {
          regions: operatingRegions,
          services: operatingMeta.services,
          tourCategories: operatingMeta.tourCategories,
        },
      });
      setInitialForm((prev) => (prev ? { ...prev, brandName: form.brandName } : prev));
      setInitialOperatingRegions([...operatingRegions]);
      toast.success(isIndividual ? "Profile updated" : "Business profile updated");
    } catch (err) {
      toast.error(err.response?.data?.message || (isIndividual ? "Failed to update profile" : "Failed to update business profile"));
    } finally { setSaving(false); }
  };

  // Social links persist to the backend immediately on add / edit / remove.
  const handlePersistSocials = async (socials) => {
    await updateBusinessProfile({ businessInfo: socials });
    setInitialForm((prev) => (prev ? { ...prev, ...socials } : prev));
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > config.upload.maxFileSize) { toast.error("Logo must be smaller than 5MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleUploadLogo = async () => {
    if (!logoFile) return;
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("logo", logoFile);
      const result = await uploadSupplierLogo(formData);
      if (result?.logoUrl) {
        setCurrentLogoUrl(result.logoUrl);
        useAuthStore.getState().updateUser({ logoUrl: result.logoUrl });
        toast.success("Logo uploaded");
        setLogoFile(null); setLogoPreview(null);
      }
    } catch (err) { toast.error(err.response?.data?.message || "Failed to upload logo"); }
    finally { setUploadingLogo(false); }
  };

  const handleRemoveLogo = async () => {
    try {
      await updateCurrentUser({ logoUrl: null });
      setCurrentLogoUrl(null);
      useAuthStore.getState().updateUser({ logoUrl: null });
      toast.success("Logo removed");
    } catch { toast.error("Failed to remove logo"); }
  };

  const hasPersonalChanges = initialForm && JSON.stringify({
    name: form.name, phone: form.phone, language: form.language, timezone: form.timezone,
    email: form.email,
  }) !== JSON.stringify({
    name: initialForm.name, phone: initialForm.phone,
    language: initialForm.language, timezone: initialForm.timezone,
    email: initialForm.email,
  });

  const hasBusinessChanges = initialForm && JSON.stringify({
    brandName: form.brandName,
    description: form.description, address: form.address, city: form.city,
    country: form.country, region: form.region, website: form.website,
    operatingHours: form.operatingHours,
    legalBusinessName: form.legalBusinessName, businessType: form.businessType,
    registrationNumber: form.registrationNumber, tin: form.tin,
    yearEstablished: form.yearEstablished,
    instagram: form.instagram, facebook: form.facebook, twitter: form.twitter,
    tiktok: form.tiktok, youtube: form.youtube, linkedin: form.linkedin,
    whatsapp: form.whatsapp, pinterest: form.pinterest,
  }) !== JSON.stringify({
    brandName: initialForm.brandName,
    description: initialForm.description, address: initialForm.address, city: initialForm.city,
    country: initialForm.country, region: initialForm.region, website: initialForm.website,
    operatingHours: initialForm.operatingHours,
    legalBusinessName: initialForm.legalBusinessName, businessType: initialForm.businessType,
    registrationNumber: initialForm.registrationNumber, tin: initialForm.tin,
    yearEstablished: initialForm.yearEstablished,
    instagram: initialForm.instagram, facebook: initialForm.facebook, twitter: initialForm.twitter,
    tiktok: initialForm.tiktok, youtube: initialForm.youtube, linkedin: initialForm.linkedin,
    whatsapp: initialForm.whatsapp, pinterest: initialForm.pinterest,
  });

  const hasRegionsChanges = JSON.stringify(operatingRegions) !== JSON.stringify(initialOperatingRegions);
  const hasProfileChanges = hasBusinessChanges || hasRegionsChanges;

  if (loading) return <LoadingSkeleton />;

  return (
    <motion.div variants={FADE_UP} initial="initial" animate="animate" exit="exit" className="space-y-6">
      {/* Personal Info */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <User size={16} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Personal Information</h2>
            <p className="text-xs text-slate-500">Update your personal details</p>
          </div>
        </div>
        <form onSubmit={handleSavePersonal} className="px-6 py-5 space-y-5">
          <div className="flex flex-col items-center mb-2">
            <div className="w-20 h-20 rounded-full overflow-hidden shadow-lg bg-slate-50 ring-2 ring-emerald-100">
              {(authUser?.photoURL || authUser?.avatar) ? (
                <OptimizedImage src={authUser.photoURL || authUser.avatar} width={80} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-emerald-600">{(authUser?.name || "S").charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2">Photo from your Google account</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input type="email" value={form.email || authUser?.email || ""} disabled
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-500 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <Phone size={13} className="inline mr-1 text-slate-400" />Phone
              </label>
              <PhoneInput
                value={form.phone || ''}
                onChange={(val) => setForm((p) => ({ ...p, phone: val }))}
                defaultCountry="US"
                placeholder="Phone number"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <Globe size={13} className="inline mr-1 text-slate-400" />Language
                </label>
                <Select value={form.language} onValueChange={(v) => setForm((p) => ({ ...p, language: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="sw">Swahili</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                    <SelectItem value="ar">Arabic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <Clock size={13} className="inline mr-1 text-slate-400" />Timezone
                </label>
                <input type="text" value={form.timezone} onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))}
                  placeholder="e.g. Africa/Accra"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" />
              </div>
            </div>
          </div>
          <div className="pt-2">
            <button type="submit" disabled={saving || !hasPersonalChanges}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* Company Logo / Profile Logo */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">{isIndividual ? "Profile Logo" : "Company Logo"}</h2>
          <p className="text-xs text-slate-500">{isIndividual ? "Upload a profile image for public display" : "Upload your business logo for public display"}</p>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-start gap-6">
            <div className="shrink-0">
              {logoPreview ? (
                <div className="relative w-24 h-24 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <img src={logoPreview} alt="Preview" loading="lazy" className="w-full h-full object-cover" />
                </div>
              ) : currentLogoUrl ? (
                <div className="relative w-24 h-24 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <OptimizedImage src={currentLogoUrl} width={96} className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = "none"; }} />
                </div>
              ) : null}
            </div>
            <div className="flex-1 space-y-3">
              {logoPreview ? (
                <div className="flex items-center gap-2">
                  <button onClick={handleUploadLogo} disabled={uploadingLogo}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-700 transition-all disabled:opacity-50">
                    {uploadingLogo ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    {uploadingLogo ? "Uploading..." : "Upload Logo"}
                  </button>
                  <button onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50 transition-all">
                    <X size={16} /> Cancel
                  </button>
                </div>
              ) : currentLogoUrl ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-700 transition-all">
                    <Upload size={13} /> Change Logo
                  </button>
                  <button onClick={handleRemoveLogo}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-red-600 rounded-xl text-xs font-medium hover:bg-red-50 transition-all">
                    <Trash2 size={16} /> Remove
                  </button>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-700 transition-all">
                  <Upload size={13} /> Select Logo
                </button>
              )}
              <p className="text-xs text-slate-400">Supports JPG, PNG, WebP. Max 5MB. Square images work best.</p>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
        </div>
      </div>

      {/* Business Profile / Public Profile */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <Building2 size={16} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">{isIndividual ? "Public Profile" : "Business Profile"}</h2>
            <p className="text-xs text-slate-500">
              {isIndividual
                ? "How you appear to travelers on your public profile"
                : "Information displayed to customers on your public profile"}
            </p>
          </div>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Business / Brand name</label>
            <input type="text" value={form.brandName}
              onChange={(e) => setForm((p) => ({ ...p, brandName: e.target.value }))}
              placeholder="Your public brand or business name"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" />
            <p className="mt-1.5 text-xs text-slate-400">The name from your supplier application, shown to travelers on your public profile.</p>
          </div>

          {!isIndividual && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Business details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Legal Business Name</label>
                  <input type="text" value={form.legalBusinessName}
                    onChange={(e) => setForm((p) => ({ ...p, legalBusinessName: e.target.value }))}
                    placeholder="As registered with the Registrar General"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Business Type</label>
                  <Select value={form.businessType || "individual"}
                    onValueChange={(v) => setForm((p) => ({ ...p, businessType: v }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="company">Registered Company</SelectItem>
                      <SelectItem value="non_profit">Non-profit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Registration Number</label>
                  <input type="text" value={form.registrationNumber}
                    onChange={(e) => setForm((p) => ({ ...p, registrationNumber: e.target.value }))}
                    placeholder="e.g. CS123456789"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Tax Identification Number (TIN)</label>
                  <input type="text" value={form.tin}
                    onChange={(e) => setForm((p) => ({ ...p, tin: e.target.value }))}
                    placeholder="e.g. C0012345678"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Year Established</label>
                  <input type="text" inputMode="numeric" value={form.yearEstablished}
                    onChange={(e) => setForm((p) => ({ ...p, yearEstablished: e.target.value.replace(/[^0-9]/g, "").slice(0, 4) }))}
                    placeholder="e.g. 2019"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" />
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Taken from your supplier application. Update anything that has changed since you applied.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Business Description</label>
            <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3} placeholder="Tell travelers about your business, your story, and what makes your property special..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all resize-none" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <MapPin size={13} className="inline mr-1 text-slate-400" />Address
              </label>
              <input type="text" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="Street address"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
                <input type="text" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Country</label>
                <input type="text" value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Region</label>
                <input type="text" value={form.region} onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <Globe size={13} className="inline mr-1 text-slate-400" />Website
              </label>
              <input type="url" value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                placeholder="https://yourbusiness.com"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 transition-all" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <MapPin size={13} className="inline mr-1 text-slate-400" />Where do you mainly operate?
            </label>
            <p className="text-xs text-slate-400 mb-3">
              Select at least one region — the choices you made when applying. Shown to guests and used to match bookings.
            </p>
            <div className="flex flex-wrap gap-2" id="operatingRegions" data-field="operatingRegions">
              {GHANA_REGIONS.map((region) => {
                const selected = operatingRegions.includes(region);
                return (
                  <button key={region} type="button" aria-pressed={selected}
                    onClick={() => setOperatingRegions((prev) => (selected ? prev.filter((r) => r !== region) : [...prev, region]))}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all",
                      selected
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"
                    )}>
                    {region}
                  </button>
                );
              })}
            </div>
            {operatingRegions.length === 0 && (
              <p className="mt-2 text-xs text-amber-600">You have not selected any regions yet.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <Clock size={13} className="inline mr-1 text-slate-400" />Operating Hours
            </label>
            <p className="text-xs text-slate-400 mb-3">
              The hours your business is open. Leave a day empty if you are closed.
            </p>
            <OperatingHoursEditor
              value={form.operatingHours}
              onChange={(next) => {
                setForm((p) => ({ ...p, operatingHours: next }));
                if (Object.keys(hoursErrors).length > 0) setHoursErrors({});
              }}
              errors={hoursErrors}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Social Media Links</label>
            <SocialMediaManager
              value={{
                twitter: form.twitter, instagram: form.instagram, facebook: form.facebook,
                tiktok: form.tiktok, youtube: form.youtube, linkedin: form.linkedin,
                whatsapp: form.whatsapp, pinterest: form.pinterest,
              }}
              onChange={(next) => setForm((p) => ({ ...p, ...next }))}
              onPersist={handlePersistSocials}
            />
            <p className="mt-2 text-xs text-slate-400">
              Social links are saved to your public business profile automatically.
            </p>
          </div>

          <div className="pt-2">
            <button onClick={handleSaveBusiness} disabled={saving || !hasProfileChanges}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isIndividual ? "Save Profile" : "Save Business Profile"}
            </button>
          </div>
        </div>
      </div>

      {/* Verification identity — read-only record of the application's identity details */}
      {(representativeInfo.fullName || representativeInfo.dateOfBirth || representativeInfo.idType || representativeInfo.idNumber) && (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <IdCard size={16} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Verification Identity</h2>
              <p className="text-xs text-slate-500">Submitted in your supplier application</p>
            </div>
          </div>
          <div className="px-6 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full name (as shown on ID)</label>
                <input value={representativeInfo.fullName} disabled
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-600 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input value={representativeInfo.email} disabled
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-600 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                <input value={representativeInfo.phoneNumber} disabled
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-600 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Date of birth</label>
                <input value={representativeInfo.dateOfBirth} disabled
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-600 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">ID type</label>
                <input value={representativeInfo.idType} disabled
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-600 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">ID number</label>
                <input value={maskId(representativeInfo.idNumber)} disabled
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-600 cursor-not-allowed" />
              </div>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-400">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-500" />
              Submitted during registration and used for identity verification. Contact support if any of these details have changed.
            </p>
          </div>
        </div>
      )}
      <SaveBar visible={Boolean(hasPersonalChanges)} saving={saving} onSave={() => handleSavePersonal()} label="Save changes" />
    </motion.div>
  );
}

export default ProfileTab;
