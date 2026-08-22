# Gurukul SwiftPay

આ પ્રોજેક્ટ માટેનો સંપૂર્ણ A to Z પ્રોફેશનલ પ્રોમ્પ્ટ તૈયાર છે. જો તમે આ

પ્રોમ્પ્ટ કોઈ ડેવલપરને, AI (જેમ કે ChatGPT/Claude) ને આપો અથવા ફ્રીલાન્સરને આપો,

તો તેને એક જ વખતમાં આખી સિસ્ટમ સમજાય જશે.

🇮🇳 ગુજરાતી વર્ઝન (Gujarati Prompt)

વિષય: શ્રી સ્વામિનારાયણ ગુરુકુલ (ઢેબર રોડ, રાજકોટ) માટે કેશલેસ/ટોકનલેસ કિઓસ્ક

રસીદ સિસ્ટમ.

મુખ્ય હેતુ: વિદ્યાર્થીઓ પાસેથી રોકડ સ્વીકાર્યા વગર, માત્ર લોગિંગ અને રસીદ કાઢવા

માટેનું PC બેઝ્ડ સોફ્ટવેર બનાવવું. આ સિસ્ટમ મુખ્ય ERP સાથે જોડાયેલી નથી, પણ

અહીંથી એક્સેલ એક્સપોર્ટ કરીને મેઈન ERP માં બલ્ક અપલોડ કરવાનું છે.

૧. વિદ્યાર્થી સાઇડ (Kiosk Workflow - 3 Steps)

PC ફુલ-સ્ક્રીન લોક (Kiosk Mode) મોડમાં રહેશે.

1.  ફિંગરપ્રિન્ટ સ્કેન: વિદ્યાર્થી આંગળી મૂકશે.

2.  NFC કાર્ડ ટેપ: વિદ્યાર્થી કાર્ડ ટેપ કરશે. (સિસ્ટમ વેરિફાય કરશે કે ફિંગર અને

    NFC એક જ વિદ્યાર્થીના છે).

3.  સર્વિસ સિલેક્શન: ઓપ્શન્સ દેખાશે (દા.ત. Store, Haircut).

મહત્વની શરત: વિદ્યાર્થીને તેના ખાતાનું બેલેન્સ ક્યારેય દેખાડવું નહીં.

૨. એડમિન કંટ્રોલ પેનલ (Admin Panel)

| ફીચર                   | વિગત                                                                          |

| :--------------------- | :---------------------------------------------------------------------------- |

| **Dashboard**          | પ્રોફેશનલ લૂક, આજનું કુલ ટ્રાન્ઝેક્શન અને કાઉન્ટ.                             |

| **Student Management** | સિંગલ એન્ટ્રી + એક્સેલ બલ્ક અપલોડ (સેમ્પલ ફાઈલ ડાઉનલોડની સાથે).               |

| **Temporary Block**    | SUID સર્ચ કરીને કોઈ પણ વિદ્યાર્થીને એક ક્લિક પર બ્લોક/અનબ્લોક કરવું.          |

| **Service Master**     | સર્વિસનું નામ, ફિક્સ રકમ (દા.ત. 30/50), અને પ્રિન્ટ કરવી કે નહીં (Checkbox).  |

| **Daily Limit**        | ગ્લોબલ અથવા સર્વિસ વાઈઝ લિમિટ (દા.ત. ₹500/દિવસ).                              |

| **Custom Messages**    | Success Message, Limit Reached Message, અને Blocked Message જાતે બદલવાની છૂટ. |

| **User Rights**        | અલગ અલગ સ્ટાફને મેન્યુઅલી પરમિશન આપવી.                                        |

| **Export Report**      | \`NFCNO                                                                       |

૩. બિઝનેસ લોજિક (Rules)

  - કુલ મર્યાદા (Cumulative Limit): જો વિદ્યાર્થી દિવસમાં ₹100, ₹200 એમ વાપરે

    અને ₹500 પહોંચે, તો તે પછીના પ્રયાસે રોકાઈ જવો જોઈએ.

  - કસ્ટમ મેસેજ પ્રિન્ટ: લિમિટ પૂરી થતાં સ્ક્રીન પર એડમિને સેટ કરેલો મેસેજ આવવો

    જોઈએ (દા.ત. "હવે કાલે આવજો, આજની લિમિટ પૂરી").

  - સાયલન્ટ પ્રિન્ટિંગ (Silent Print): "Print Receipt" ઓન હોય તો કોઈપણ પ્રિન્ટ

    ડાયલોગ બૉક્સ (Popup) વગર બેકગ્રાઉન્ડમાં થર્મલ પ્રિન્ટરથી પ્રિન્ટ નીકળવી

    જોઈએ.

૪. હાર્ડવેર અને ટેકનોલોજી સ્ટેક

  - OS/Mode: Windows (Kiosk / Locked Desktop).

  - Hardware: Mantra/Morpho Fingerprint, USB NFC Reader, 80mm/58mm Thermal

    Printer.

  - Suggested Stack: C# .NET Desktop App / Python (Tkinter/WPF) + SQLite/MySQL.

🇬🇧 ENGLISH VERSION (Professional Prompt)

Project Title: Cashless/Tokenless Kiosk Receipt System for Shree Swaminarayan

Gurukul (Dhebar Road, Rajkot).

Objective: Build a locked-down, PC-based logging and receipt generation utility

for students without handling cash or maintaining live student wallets. Data

will be exported via Excel for bulk upload into the main institutional ERP.

1. Student Kiosk Flow (3-Step Lock-in)

Running in Full-Screen Kiosk Mode.

1.  Fingerprint Scan (Biometric auth).

2.  NFC Card Tap (Identity confirmation: Finger + NFC match).

3.  Service Selection (Buttons: Store, Haircut, etc.).

Strict UI Rule: Never display student balance on screen.

2. Admin Configuration Panel

| Module                | Description                                                                 |

| :-------------------- | :-------------------------------------------------------------------------- |

| **Dashboard**         | Clean metrics (Today's count, total category hits).                         |

| **Student Master**    | Single Add + Bulk Excel Upload (with Sample Export link).                   |

| **Access Control**    | Instant Temporary Block/Unblock toggle via SUID search.                     |

| **Service Config**    | Define Name, Fixed Price (e.g., 30/50), and `Print Receipt` boolean toggle. |

| **Daily Cap**         | Cumulative daily spend limit (e.g., ₹500 max/day).                          |

| **Dynamic Messages**  | Editable fields for Success, Limit Reached, and Blocked notices.            |

| **Staff Permissions** | Granular manual role assignments.                                           |

| **Reports & Export**  | Columns: \`NFCNO                                                            |

3. Enforcement Logic

  - Cumulative Limit Check: Tracks sum of today's slips. E.g., if total reaches

    ₹500, next attempt is blocked.

  - Custom Block Notice: Displays admin's custom Gujarati/English warning (e.g.,

    "Aaj ni limit puri, kale avjo").

  - Silent/Raw Printing: Zero print popups. Direct ESC/POS thermal command

    firing upon click/selection.

4. Technical Blueprint

  - Platform: Windows Desktop App (forced single-app kiosk policy).

  - Peripherals: Biometric SDK (Mantra/Morpho), HID NFC Reader, POS Thermal

    Printer.

  - Recommended Stack: C# (.NET WinForms/WPF) or Python + Local DB

    (SQLite/MySQL).

💡 ડેવલપરને આપતી વખતે સાથે આ પણ મોકલજો (Checklist to handover):

| વસ્તુ             | તમે શું આપશો?                                                     |

| :---------------- | :---------------------------------------------------------------- |

| **Sample Excel**  | મેઈન ERP માં જે ફોર્મેટમાં ઇમ્પોર્ટ થાય છે તેની નાની એક્સેલ ફાઈલ. |

| **Printer Model** | થર્મલ પ્રિન્ટરનું મોડેલ નંબર (જેથી ડ્રાઇવર મિચ ન થાય).            |

| **Finger Device** | ફિંગરસ્કેનરની બ્રાન્ડ (Mantra કે Morpho - SDK અલગ હોય).           |

આ પ્રોમ્પ્ટ સીધો કોપી કરીને મોકલી દેશો એટલે કોઈ કન્ફ્યુઝન નહીં થાય! જય

સ્વામિનારાયણ.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fd7688df-0e7c-4815-a67d-a0377dd396f6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
