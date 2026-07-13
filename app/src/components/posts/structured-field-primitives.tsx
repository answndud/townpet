import type { ReactNode } from "react";

import {
  ADOPTION_AGE_LABEL_SUGGESTIONS,
  ADOPTION_ANIMAL_TYPE_SUGGESTIONS,
  ADOPTION_BREED_SUGGESTIONS,
  HOSPITAL_TREATMENT_TYPE_SUGGESTIONS,
  STRUCTURED_REGION_SUGGESTIONS,
  VOLUNTEER_TYPE_SUGGESTIONS,
} from "@/lib/structured-field-normalization";

type StructuredFieldSectionProps = {
  title: string;
  children: ReactNode;
};

export function StructuredFieldSection({ title, children }: StructuredFieldSectionProps) {
  return (
    <section className="tp-card overflow-hidden">
      <div className="tp-form-section-bar">
        <p className="tp-form-section-title">{title}</p>
      </div>
      <div className="grid gap-3 p-3 sm:p-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function StructuredFieldDatalists() {
  const datalists: Array<readonly [string, readonly string[]]> = [
    ["hospital-treatment-type-options", HOSPITAL_TREATMENT_TYPE_SUGGESTIONS],
    ["structured-region-options", STRUCTURED_REGION_SUGGESTIONS],
    ["adoption-animal-type-options", ADOPTION_ANIMAL_TYPE_SUGGESTIONS],
    ["adoption-breed-options", ADOPTION_BREED_SUGGESTIONS],
    ["adoption-age-label-options", ADOPTION_AGE_LABEL_SUGGESTIONS],
    ["volunteer-type-options", VOLUNTEER_TYPE_SUGGESTIONS],
  ];

  return (
    <>
      {datalists.map(([id, options]) => (
        <datalist key={id} id={id}>
          {options.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      ))}
    </>
  );
}
