import { DEFAULT_THANK_YOU_MESSAGE, getRouting, getSubmitBaseUrl } from './constant.js';
import { getCSRFToken } from './util.js';

export function submitSuccess(e, form) {
  const { payload } = e;
  const redirectUrl = form.dataset.redirectUrl || payload?.body?.redirectUrl;
  const thankYouMsg = form.dataset.thankYouMsg || payload?.body?.thankYouMessage;
  if (redirectUrl) {
    window.location.assign(encodeURI(redirectUrl));
  } else {
    let thankYouMessage = form.parentNode.querySelector('.form-message.success-message');
    if (!thankYouMessage) {
      thankYouMessage = document.createElement('div');
      thankYouMessage.className = 'form-message success-message';
    }
    thankYouMessage.innerHTML = thankYouMsg || DEFAULT_THANK_YOU_MESSAGE;
    form.parentNode.insertBefore(thankYouMessage, form);
    if (thankYouMessage.scrollIntoView) {
      thankYouMessage.scrollIntoView({ behavior: 'smooth' });
    }
    form.reset();
  }
  form.setAttribute('data-submitting', 'false');
  form.querySelector('button[type="submit"]').disabled = false;
}

export function submitFailure(e, form) {
  let errorMessage = form.querySelector('.form-message.error-message');
  if (!errorMessage) {
    errorMessage = document.createElement('div');
    errorMessage.className = 'form-message error-message';
  }
  errorMessage.innerHTML = 'Some error occured while submitting the form'; // TODO: translation
  form.prepend(errorMessage);
  errorMessage.scrollIntoView({ behavior: 'smooth' });
  form.setAttribute('data-submitting', 'false');
  form.querySelector('button[type="submit"]').disabled = false;
}

function generateUnique() {
  return new Date().valueOf() + Math.random();
}

function getFieldValue(fe, payload) {
  if (fe.type === 'radio') {
    return fe.form.elements[fe.name].value;
  } if (fe.type === 'checkbox') {
    if (fe.checked) {
      if (payload[fe.name]) {
        return `${payload[fe.name]},${fe.value}`;
      }
      return fe.value;
    }
  } else if (fe.type !== 'file') {
    return fe.value;
  }
  return null;
}

function constructPayload(form) {
  const payload = new FormData(form);
  return payload ;
}

async function prepareRequest(form) {
  const  payload  = constructPayload(form);
  const {
    branch, site, org, tier,
  } = getRouting();
  let tokenResponse = await getCSRFToken();
  const headers = {
    'Content-Type': 'application/json',
    'CSRF-Token': tokenResponse.token,
  };

  const body = payload ;
  let url;
  let baseUrl = getSubmitBaseUrl();
  if (false) {
    baseUrl = 'https://forms.adobe.com/adobe/forms/af/submit/';
    headers['x-adobe-routing'] = `tier=${tier},bucket=${branch}--${site}--${org}`;
    url = baseUrl + btoa(form.dataset.action);
  } else {
    url = "https://qdenga.aemclouddev.takeda.com/content/takeda/denguehcp/us/en/index/jcr:content.signup.json";
  }
  return { headers, body, url };
}

async function submitDocBasedForm(form, captcha) {
  try {
    await grecaptcha?.execute();
    const { headers, body, url } = await prepareRequest(form, captcha);
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    const response = await fetch(url, {
      method: 'POST',
      ...headers,
      body: body,
    });
    let responseObj = await response.json();
    if (responseObj.success) {
      submitSuccess(response, form);
    } else {
      const error = await response.text();
      throw new Error(error);
    }
  } catch (error) {
    submitFailure(error, form);
  }
}

export async function handleSubmit(e, form, captcha) {
  e.preventDefault();
  const valid = form.checkValidity();
  if (valid) {
    e.submitter?.setAttribute('disabled', '');
    if (form.getAttribute('data-submitting') !== 'true') {
      form.setAttribute('data-submitting', 'true');

      // hide error message in case it was shown before
      form.querySelectorAll('.form-message.show').forEach((el) => el.classList.remove('show'));

      if (form.dataset.source === 'sheet') {
        await submitDocBasedForm(form, captcha);
      }
    }
  } else {
    const firstInvalidEl = form.querySelector(':invalid:not(fieldset)');
    if (firstInvalidEl) {
      firstInvalidEl.focus();
      firstInvalidEl.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
