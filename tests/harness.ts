// Bộ kiểm tra tối giản (không thêm thư viện): check() ghi kết quả theo bộ đang chạy, report() in và trả số lỗi.
interface Result {
  suite: string;
  name: string;
  ok: boolean;
  info: string;
}

const results: Result[] = [];
let current = "";

export function setSuite(name: string): void {
  current = name;
}

export function check(name: string, ok: boolean, info = ""): void {
  results.push({ suite: current, name, ok, info });
}

/** In kết quả từng bộ; trả về số mục lỗi. */
export function report(verbose: boolean): number {
  let fail = 0;
  for (const suite of [...new Set(results.map((r) => r.suite))]) {
    const rs = results.filter((r) => r.suite === suite);
    const bad = rs.filter((r) => !r.ok);
    fail += bad.length;
    console.log(`${bad.length ? "LỖI" : "ĐẠT"}  ${suite}: ${rs.length - bad.length}/${rs.length}`);
    for (const r of verbose ? rs : bad) console.log(`     ${r.ok ? "đạt" : "LỖI"}  ${r.name}  ${r.info}`);
  }
  console.log(fail ? `\n${fail} mục lỗi` : `\nTất cả ${results.length} mục đạt`);
  return fail;
}
