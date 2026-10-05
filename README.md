# El Mundo Hispano · Role Play

Sitio web responsive para practicar conversación en español con juegos por niveles.

- `index.html` (`/`): página de inicio con la escalera de niveles.
- `a1-1.html` (`/a1-1`): nivel A1.1, siete retos con selección aleatoria sin repeticiones.
- `a1-2.html` (`/a1-2`): nivel A1.2, quince cartas de situaciones boca abajo que se giran.
- `conversacion.html` (`/conversacion`): ruleta de cuatro temas de conversación con temporizador.
- `app.js`: movimiento, transiciones entre páginas y visor de imágenes compartidos; cada página tiene su propio script.
- `auth.html` (`/auth`), `account.html` (`/account`), `admin.html` (`/admin`): acceso con correo y contraseña, cuenta del alumno y panel de administración. Configuración en `AUTH_SETUP.md`.
- `vercel.json`: URLs limpias (sin `.html`) en Vercel.
- `assets/`: logo, iconos de las apps recomendadas e imágenes de ambientación generadas para el proyecto.

Para verlo en local con las URLs limpias: `npx serve`.
