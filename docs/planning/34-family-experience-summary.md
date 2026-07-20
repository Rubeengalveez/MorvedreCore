# Experiencia familiar integrada

Fecha de cierre: 20 de julio de 2026.

## Resultado

La familia ya no se gestiona cambiando o suplantando el perfil activo. El tutor entra con su propia cuenta y ve simultáneamente a todos sus hijos, tanto en Inicio como en Perfil y Calendario.

La nueva vista familiar muestra por hijo:

- identidad y color de categoría;
- equipo o equipos de la temporada;
- próximo entrenamiento o partido;
- partidos, goles y asistencia;
- compras que necesitan una decisión.

## Adaptación al número de hijos

La interfaz se ha diseñado principalmente para las situaciones reales del club: uno o dos hijos por tutor. Con un hijo no aparecen huecos ni selectores innecesarios y, en pantallas estrechas, las gestiones se presentan en una sola columna. Con dos hijos se mantiene una tarjeta completa por menor y una cuadrícula compacta de acciones, de forma que sea fácil comparar próximos compromisos y asuntos pendientes.

Si una familia tiene tres hijos, la cabecera se reorganiza automáticamente, muestra dos avatares y un indicador `+1`, y conserva las tres tarjetas en vertical. Los nombres admiten dos líneas y las gestiones mantienen etiquetas visibles y áreas táctiles de al menos 48 px. El comportamiento se ha comprobado a 320 px para uno y tres hijos, y a 390 px para dos.

Al abrir un partido, el tutor encuentra una respuesta independiente para cada hijo convocado. Puede confirmar o rechazar su asistencia sin suplantar la cuenta del menor ni alterar el resto de la aplicación.

Perfil incorpora además un resumen de las cuotas para cualquier cuenta adulta. Tesorería agrupa el detalle por persona cuando existe una familia.

## Reglas de seguridad

- Menor: necesita un tutor vinculado para crear un pedido.
- Pedido de menor: queda pendiente de la familia y no avisa a la tienda.
- Cola de tienda: no muestra solicitudes pendientes de familia y no puede aprobarlas ni saltarse estados.
- Aprobación: solo un tutor adulto vinculado puede decidirla; ni administración ni tienda pueden saltarse este paso.
- Pedido aprobado: pasa a tienda y entonces se envía el correo operativo.
- Adulto: envía directamente a tienda y no ve estados ni textos de aprobación familiar.
- Tesorería: un menor no puede consultar sus importes desde la interfaz ni desde la Data API.
- Tutor adulto: puede consultar sus propios importes y los de todos sus hijos vinculados.

La edad se deriva de `birth_year`. Si falta, se adopta el comportamiento seguro: aprobación familiar obligatoria en tienda y sin acceso a información financiera.

## Datos de prueba

`scripts/seed/family-demo.mjs` crea o normaliza una familia demostrable con una madre y dos hijos en categorías distintas. Reutiliza jugadores del conjunto demo para conservar entrenamientos, partidos, asistencia y rankings coherentes; además deja una compra de menor pendiente y configura a la madre como responsable de cobro.

`scripts/validate-family-demo.mjs` inicia sesión con cuentas reales y verifica:

- dos hijos visibles para el tutor;
- tesorería familiar accesible al tutor;
- tesorería invisible al menor por RLS;
- pedido pendiente visible para tutor e hija;
- pedido adulto sin aprobación familiar.
- integridad de vínculos: no se admite un tutor menor ni un hijo adulto.
- convocatoria: un tutor puede responder únicamente por sus menores vinculados; la autorización se valida en la acción y en RLS.

La contraseña demo se recibe mediante `FAMILY_DEMO_PASSWORD` o `SEED_PASSWORD` y no se versiona.

## Verificación

- TypeScript strict.
- ESLint.
- pruebas unitarias de mayoría de edad, reglas de tienda y renderizado familiar con uno, dos y tres hijos;
- prueba estructural de la migración;
- recorrido E2E autenticado de tutor, menor, calendario, compras y convocatoria;
- revisión visual móvil a 320 px y 390 px;
- validación autenticada contra el Supabase cloud;
- migración aplicada y consultada en el proyecto enlazado.
- asesores cloud: sin avisos nuevos de seguridad; permanecen solo las dos excepciones globales ya documentadas del archivado de temporada y el plan gratuito de Auth.

## Gestión administrativa

El permiso `manage_families` permite crear y retirar vínculos sin conceder administración total. El alta solo ofrece adultos activos como tutores y menores activos como hijos, asigna el rol familiar y propone al tutor como responsable de cobro. La base de datos repite estas reglas mediante trigger para que tampoco puedan eludirse desde una petición directa.

No se puede retirar el último tutor de un menor mientras tenga una compra pendiente de aprobación. Si cambia el tutor responsable, tesorería reasigna el cobro a otro tutor vinculado.

Las migraciones de esta entrega son:

- `20260720185541_family_guardian_experience.sql`;
- `20260720195234_family_function_privileges.sql`;
- `20260720200228_family_link_integrity.sql`;
- `20260720203127_family_guardian_sports_management.sql`;
- `20260720204711_family_callup_column_integrity.sql`.
