import { Fragment } from 'react';

/** Gabungkan potongan dengan " · ", abaikan yang kosong (false/null). */
export function joinDot(bits) {
  const list = bits.filter(Boolean);
  return list.map((b, i) => (
    <Fragment key={i}>
      {i > 0 && ' · '}
      {b}
    </Fragment>
  ));
}

/** Banyak tempat memakai kata-kata bentuk "n tulisan"; satu fungsi supaya konsisten. */
export const pad2 = (n) => ('0' + n).slice(-2);
