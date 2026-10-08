# مراجعة Supabase مقارنة بالتطبيق — 2026-10-08

المشروع: `adham-ai-agent-2026` / `chkdoiqvffwjflbnvjrm`، منطقة `eu-west-1`، الحالة الحية `ACTIVE_HEALTHY`، PostgreSQL `17.6.1.166`.
المصادر: STATUS.md، اتصال Supabase الحالي، كتالوج PostgreSQL، ملفات migrations، ومسارات التطبيق المنشور.
كل استعلامات الفحص كانت داخل `BEGIN READ ONLY … ROLLBACK`. لم تُنفذ migrations أو عمليات تعديل بيانات/صلاحيات أو تشغيل workflows.

## الجداول والقيود والعلاقات

| العنصر | القاعدة الفعلية | المقارنة بالتطبيق |
|---|---|---|
| `public.agent_user_settings` | 5 أعمدة، 3 سجلات | مطابق لـ `lib/platform/user-settings.ts` وmigration 0003 |
| مفتاح الإعدادات | `user_id text` مفتاح أساسي | مناسب للهوية الموقعة بصيغة `visitor:<uuid>` |
| تعليمات المستخدم | نص مطلوب بطول 1–8000 | مطابق للتحقق في `app/api/settings/route.ts` |
| الذاكرة | default true، NOT NULL، CHECK IS TRUE؛ لا سجلات مخالفة | مطابق لـmigration 0005؛ العلم وحده لا يثبت حفظ محتوى المحادثات |
| `public.agent_workflow_runs` | 10 أعمدة، صفر سجلات | مطابق لـ `lib/platform/run-repository.ts` وmigration 0001 |
| قيود التشغيل | 7 workflow IDs، 3 حالات، مدة غير سالبة، اتساق وقت الإكمال | مطابقة لتعريفات التطبيق؛ القيود الثمانية على الجدولين validated |
| العلاقات | صفر Foreign Keys في public وmastra | التطبيق يربط الهوية منطقيًا عبر user_id؛ لا يوجد دليل أن FK إلى auth.users مناسب لهذا النموذج |
| `mastra` | المخطط موجود، بلا جداول أو views أو functions | الكود يهيئ PostgresStore عليه؛ تهيئة جداول التخزين وتنفيذ workflow فعلي غير مثبتين |

لا توجد views أو functions في public أيضًا. فُحصت مخططات التطبيق، وليس محتوى جداول auth/storage/realtime الداخلية.

## الصلاحيات والعزل

- الجدولان مملوكان لـpostgres، وRLS وFORCE RLS مفعّلان على كليهما.
- `anon` و`authenticated`: لا SELECT/INSERT/UPDATE/DELETE/TRUNCATE على الجدولين؛ تحقّق الفحص من الصلاحيات الفعلية باستخدام has_table_privilege.
- `agent_runtime`: يسمح له SELECT/INSERT/UPDATE/DELETE، ولا يسمح TRUNCATE؛ الدور LOGIN، وليس superuser ولا BYPASSRLS، وNOINHERIT.
- `service_role`: له صلاحيات أوسع تشمل TRUNCATE ويملك BYPASSRLS. تفعيل FORCE RLS لا يمنع هذا الدور من تجاوز RLS.
- توجد سياسة ALL لكل من agent_runtime وservice_role على كل جدول، باستخدام `USING true / WITH CHECK true`.
- لذلك RLS يقفل الوصول العام، لكنه لا يعزل الزوار عن بعضهم داخل agent_runtime. عزل الإعدادات والتاريخ موجود في استعلامات الخادم `WHERE user_id = $1` بعد تحقق توقيع هوية الزائر.
- تحديث إكمال التشغيل يعتمد على id الذي يولده الخادم؛ لا يعتمد على user_id في شرط UPDATE.
- مخطط mastra يمنح agent_runtime صلاحيتَي USAGE وCREATE؛ لا يمنحهما لـPUBLIC/anon/authenticated.
- محاولة اختبار SELECT عبر SET LOCAL ROLE agent_runtime رفضها اتصال المراجعة: `permission denied to set role`. لم يُغيّر الدور أو عضوياته؛ اختبار الدور الفعلي مباشرة غير مكتمل.

## الفهارس

| الفهرس | ملاءمته |
|---|---|
| `agent_user_settings_pkey(user_id)` | مناسب لقراءة الإعدادات وON CONFLICT |
| `agent_workflow_runs_pkey(id)` | مناسب لتحديث إكمال التشغيل |
| `agent_workflow_runs_user_created_idx(user_id, created_at DESC)` | مطابق لترشيح التاريخ وترتيبه |
| `agent_workflow_runs_active_idx(created_at DESC) WHERE status='running'` | موجود؛ لا يظهر استعلام يستخدمه في repository الحالي |

Supabase Security Advisors: لا تنبيهات وقت الفحص. Performance Advisors: ملاحظة INFO واحدة للفهرس active_idx غير المستخدم.
سجل التشغيل فارغ؛ هذه الملاحظة ليست دليلًا كافيًا لحذف الفهرس أو الحكم على أداء تحت حمل.
مرجع الملاحظة: https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index

## الفروق والأولويات

1. **إثبات تخزين Mastra:** وجود المخطط وإعداد POSTGRES_URL لا يثبت إنشاء جداول PostgresStore أو نجاح حفظ التنفيذ. لا يجوز اعتبار هذه المراجعة اختبار workflow؛ تشغيله سيتطلب كتابة بيانات خارج نطاق الطلب الحالي.
2. **اكتمال migrations:** صلاحيات agent_runtime وسياسة `agent_workflow_runs_runtime` موجودتان فعليًا على سجل التشغيل، لكن غير ممثلتين في migrations المحلية؛ إنشاء الدور نفسه غير ممثل أيضًا. إعادة إنشاء قاعدة من هذه الملفات وحدها تحتاج متطلبات إعداد موثقة.
3. **صلاحيات الجداول المستقبلية:** default privileges لمُنشئَي postgres وsupabase_admin في public تمنح anon/authenticated صلاحيات واسعة على الجداول الجديدة. الجدولان الحاليان محميان بإلغاء الصلاحيات؛ أي جدول جديد يحتاج مراجعة مستقلة للصلاحيات وRLS.
4. **التحقق من شهادة الاتصال:** `lib/platform/database.ts` و`lib/mastra/index.ts` يستخدمان `rejectUnauthorized: false`. الاتصال مشفر لكن التحقق من شهادة الخادم معطل؛ يستحق معالجة منفصلة بعد اختبار مسار pooler بالشهادة الصحيحة.

مرجع الفرق بين grants وRLS: https://supabase.com/docs/guides/database/postgres/row-level-security

## تحقق التطبيق وحدود النتائج

- الإنتاج: `GET /eve/v1/health` أعاد 200 وready.
- `GET /api/settings` أعاد 200، memoryEnabled=true، وإعدادات افتراضية للزائر الجديد دون سجل محفوظ.
- `GET /api/executive-workflows?history=1` أعاد 200، storage=postgres، 7 workflows، وتاريخًا فارغًا.
- middleware يوفّر هوية زائر تلقائية؛ نجاح GET بدون cookie مسبق ليس دليل فتح الجداول للعامة.
- عدد البيانات قبل وبعد اختبارات GET: 3 إعدادات وصفر تشغيلات. لم تُعرض نصوص تعليمات المستخدمين أو معرفاتهم أو أسرار الاتصال.
- لم يُختبر حفظ إعدادات أو تشغيل workflow أو عزل زائرين عمليًا؛ هذه العمليات تحتاج كتابة، والطلب الحالي قراءة فقط.
- لم يُثبت دور اتصال الإنتاج من أسراره، ولم يُجر اختبار تحميل. READY وstorage=postgres لا يثبتان دوام كل مكونات الذاكرة.
