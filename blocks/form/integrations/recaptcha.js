export default class GoogleReCaptcha {
  id;

  name;

  config;

  formName;

  loadPromise;

  constructor(config, id, name, formName) {
    this.config = config;
    this.name = name;
    this.id = id;
    this.formName = formName;
  }

  #loadScript(url) {
    if (!this.loadPromise) {
      this.loadPromise = new Promise((resolve, reject) => {
        const head = document.head || document.querySelector('head');
        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.onload = () => resolve(window.grecaptcha);
        script.onerror = () => reject(new Error(`Failed to load script ${url}`));
        head.append(script);
      });
    }
  }

  loadCaptcha(form) {
    if (form && this.config.siteKey) {
      const submit = form.querySelector('button[type="submit"]');
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.#loadScript('https://www.google.com/recaptcha/api.js');
            obs.disconnect();
          }
        });
      });
      if (submit == null) {
        console.warn('Captcha can not be loaded. Submit button is missing.');
        alert('Captcha can not be loaded. Add Submit button.');
      } else {
        obs.observe(submit);
      }
    } else {
      console.warn('Captcha configuration in missing.');
      alert('Captcha can not be loaded. Captcha configuration in missing.');
    }
  }

  async getToken() {
    if (!this.config.siteKey) {
      return null;
    }
    return new Promise((resolve) => {
      const { grecaptcha } = window;
        grecaptcha.ready(async () => {
          const token = await grecaptcha.execute(this.config.siteKey, { action: 'submit' });
          resolve(token);
        });
    });
  }
}
