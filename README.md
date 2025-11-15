# yt-composer-enhancer

**Add Image Support to YouTube Comment Composer**

This extension adds image-insertion capability to the YouTube comment composer.
It works **together** with the required backend script:

➡️ **Required repository:**
[https://github.com/COXKPER/Youtube-Comment-with-image](https://github.com/COXKPER/Youtube-Comment-with-image)

---

## 📌 Features

* Adds an image button/icon to the YouTube comment composer.
* Converts custom image tags into valid URLs.
* Preview area for images before posting.

---

## 📥 Installation

1. Download or clone this repository.
2. Open **Chrome → Extensions → Developer Mode**.
3. Click **Load unpacked** and select the extension folder.
4. Make sure you have installed the **required script** from the repo above.

---

## 📸 Screenshot

![4de](https://meow.fourvo.id/screen2.jpg)

---

## ⚙️ How It Works

* The extension injects an image-button into the YouTube comment composer.
* When you select or paste an image, it generates a tag like:

  ```
  [image=https://yourdomain/...]
  ```
* The required backend script handles that tag and displays the actual image on YouTube comments.

---

## 🧩 Requirements

| Component       | Description                                       |
| --------------- | ------------------------------------------------- |
| This Extension  | Adds image button / UI to composer                |
| Required Script | Enables YouTube to **display** images in comments |

You **must** install both, or images will not appear.

---

## ❗ Known Issues

* YouTube restricts HTML injection; extension uses safe DOM mutation.
* Chrome updates may break certain preview features.
* Custom domains must resolve properly (e.g., `.dic` → `.id`).

