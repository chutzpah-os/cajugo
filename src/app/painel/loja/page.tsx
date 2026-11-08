import type { Metadata } from "next";
import { AreaPage } from "@/domains/auth/components/area-layout";
import { NoPermission } from "@/domains/auth/components/no-permission";
import { requireStorePage } from "@/domains/auth/guards";
import { StoreInfoForm } from "@/domains/stores/components/store-info-form";
import { SlugChangeForm } from "@/domains/stores/components/slug-change-form";
import { StoreSharePanel } from "@/domains/stores/components/store-share-panel";
import { hoursToForm } from "@/domains/stores/hours-form";
import { storeSummary } from "@/domains/stores/service";
import { getCloudinary } from "@/platform/cloudinary/cloudinary";
import { getDb } from "@/platform/db/client";
import { appUrl, storeUrl } from "@/platform/http/urls";

export const metadata: Metadata = { title: "Minha loja | CajuGo" };

async function Content() {
  const { session, allowed, home } = await requireStorePage(
    "/painel/loja",
    "store.edit",
  );
  if (!allowed) return <NoPermission home={home} />;
  const s = await storeSummary(getDb(), session);
  const cloudinary = getCloudinary();
  return (
    <section className="flex flex-col gap-4 py-6">
      <h1 className="text-[22px] font-extrabold">Minha loja</h1>
      <StoreSharePanel
        storeName={s.name}
        catalogUrl={storeUrl(s.slug)}
        referralUrl={
          s.referralCode
            ? `${appUrl()}/i/${s.referralCode.toLowerCase()}`
            : null
        }
        referralCode={s.referralCode}
        logoUrl={
          s.logoPublicId
            ? cloudinary.imageUrl(s.logoPublicId, { width: 200 })
            : null
        }
        coverUrl={
          s.coverPublicId
            ? cloudinary.imageUrl(s.coverPublicId, { width: 800 })
            : null
        }
      />
      <SlugChangeForm
        current={s.slug}
        appHost={new URL(appUrl()).host}
        nextAllowed={s.nextSlugChange}
      />
      <StoreInfoForm
        initial={{
          name: s.name,
          about: s.about ?? "",
          whatsapp: s.whatsapp.replace(/^55/, ""),
          instagram: s.instagram ? `@${s.instagram}` : "",
          addressStreet: s.address.street ?? "",
          addressNumber: s.address.number ?? "",
          addressComplement: s.address.complement ?? "",
          addressDistrict: s.address.district ?? "",
          addressZip: s.address.zip?.replace(/^(\d{5})(\d{3})$/, "$1-$2") ?? "",
          cityLabel: `${s.address.city}/${s.address.state}`,
          hours: hoursToForm(s.hours),
          shareByDefault: s.shareByDefault,
        }}
      />
    </section>
  );
}

/** Minha loja [3b] (STO-FR-008, 009, 012; STO-SEC-003). */
export default function MyStorePage() {
  return (
    <AreaPage>
      <Content />
    </AreaPage>
  );
}
