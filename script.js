const phone = "5491127251718";

function waLink(service = "un servicio") {
  const text = `Hola, quiero solicitar ${service} en Servicios 365.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

document.getElementById("whatsappHero").href = waLink();
document.getElementById("whatsappBottom").href = waLink();

document.querySelectorAll("[data-service]").forEach(btn => {
  btn.addEventListener("click", () => {
    window.open(waLink(btn.dataset.service), "_blank", "noopener");
  });
});
