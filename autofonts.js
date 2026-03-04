/*SM AUTOFONTS V2 | Use Site Styles font selection in CSS*/
document.addEventListener('DOMContentLoaded', function() {
    document.body.style.setProperty('--inter', 'InterVariable');
    document.body.style.setProperty('--arrows', 'InterVariable');

    ["--heading-font-font-family", "--body-font-font-family", "--meta-font-font-family"].forEach(function(c, i) {
        var classes = ["sqs-heading-font", "sqs-body-font", "sqs-meta-font"];
        var names = ['heading', 'body', 'meta'];
        var e = document.getElementsByClassName(classes[i])[0];
        var v = getComputedStyle(document.documentElement).getPropertyValue(c) || getComputedStyle(e).getPropertyValue('font-family');
        document.body.style.setProperty('--' + names[i], v.trim());
    });
});
