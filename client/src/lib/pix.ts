function crc16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

function f(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

export function buildPixPayload(
  pixKey: string,
  beneficiaryName: string,
  city: string,
  amount: number
): string {
  const gui = f("00", "BR.GOV.BCB.PIX") + f("01", pixKey);
  const merchantAccount = f("26", gui);
  const amountStr = amount > 0 ? f("54", amount.toFixed(2)) : "";
  const additionalData = f("62", f("05", "***"));
  const name = beneficiaryName.substring(0, 25).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const cityNorm = city.substring(0, 15).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const payload =
    f("00", "01") +
    merchantAccount +
    f("52", "0000") +
    f("53", "986") +
    amountStr +
    f("58", "BR") +
    f("59", name) +
    f("60", cityNorm) +
    additionalData +
    "6304";

  return payload + crc16(payload);
}
