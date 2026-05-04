package com.tfg.agile.app.user_service.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;

import java.util.Locale;

public class SmtpPasswordResetNotifier implements PasswordResetNotifier {

    private static final String SUBJECT_MESSAGE_KEY = "auth.reset-password.mail.subject";
    private static final String DEFAULT_SUBJECT = "Reset your AgileApp password";

    private final JavaMailSender mailSender;
    private final MessageSource messageSource;
    private final String fromAddress;

    public SmtpPasswordResetNotifier(JavaMailSender mailSender, MessageSource messageSource, String fromAddress) {
        this.mailSender = mailSender;
        this.messageSource = messageSource;
        this.fromAddress = fromAddress;
    }

    @Override
    public void sendPasswordReset(String email, String resetLink) {
        Locale locale = LocaleContextHolder.getLocale();
        String subject = messageSource.getMessage(SUBJECT_MESSAGE_KEY, null, DEFAULT_SUBJECT, locale);

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setTo(email);
            helper.setFrom(fromAddress);
            helper.setSubject(subject);
            helper.setText(buildPlainText(resetLink, locale), buildHtml(resetLink, locale));
            mailSender.send(mimeMessage);
        } catch (MessagingException e) {
            throw new RuntimeException("Failed to send password reset email", e);
        }
    }

    private String buildPlainText(String resetLink, Locale locale) {
        String lang = locale.getLanguage();
        if ("es".equals(lang) || "gl".equals(lang)) {
            return """
                    AgileApp — Restablecer contraseña

                    Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en AgileApp.

                    Haz clic en el siguiente enlace para crear una nueva contraseña:
                    %s

                    Este enlace es válido durante las próximas 24 horas. Si no lo usas en ese plazo, tendrás que solicitar uno nuevo.

                    Si no solicitaste este cambio, puedes ignorar este correo con total seguridad. Tu contraseña actual no se modificará.

                    ──────────────────────────────
                    AgileApp · Gestión ágil de proyectos
                    Este mensaje fue generado automáticamente. Por favor, no respondas a este correo.
                    """.formatted(resetLink);
        }
        return """
                AgileApp — Reset your password

                We received a request to reset the password for your AgileApp account.

                Click the link below to set a new password:
                %s

                This link is valid for the next 24 hours. If you don't use it within that time, you'll need to request a new one.

                If you didn't request a password reset, you can safely ignore this email. Your current password will not be changed.

                ──────────────────────────────
                AgileApp · Agile Project Management
                This message was generated automatically. Please do not reply to this email.
                """.formatted(resetLink);
    }

    private String buildHtml(String resetLink, Locale locale) {
        String lang = locale.getLanguage();
        boolean isSpanish = "es".equals(lang) || "gl".equals(lang);

        String heading        = isSpanish ? "Restablece tu contraseña" : "Reset your password";
        String intro          = isSpanish
                ? "Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong>AgileApp</strong>."
                : "We received a request to reset the password for your <strong>AgileApp</strong> account.";
        String btnLabel       = isSpanish ? "Restablecer contraseña" : "Reset password";
        String expiryNotice   = isSpanish
                ? "Este enlace es válido durante las próximas <strong>24 horas</strong>. Si no lo usas en ese plazo, tendrás que solicitar uno nuevo."
                : "This link is valid for the next <strong>24 hours</strong>. If you don't use it within that time, you'll need to request a new one.";
        String securityNotice = isSpanish
                ? "Si no solicitaste este cambio, puedes ignorar este correo con total seguridad. Tu contraseña actual no se modificará."
                : "If you didn't request a password reset, you can safely ignore this email. Your current password will not be changed.";
        String footerLine1    = isSpanish ? "Gestión ágil de proyectos de software" : "Agile software project management";
        String footerLine2    = isSpanish
                ? "Este mensaje fue generado automáticamente. Por favor, no respondas a este correo."
                : "This message was generated automatically. Please do not reply to this email.";
        String linkFallback   = isSpanish
                ? "Si el botón no funciona, copia y pega este enlace en tu navegador:"
                : "If the button doesn't work, copy and paste this link into your browser:";

        return """
                <!DOCTYPE html>
                <html lang="%s">
                <head>
                  <meta charset="UTF-8" />
                  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                  <title>%s</title>
                </head>
                <body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 0;">
                    <tr>
                      <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

                          <!-- Header -->
                          <tr>
                            <td style="background-color:#1e293b;padding:32px 40px;text-align:center;">
                              <span style="font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Agile<span style="color:#6366f1;">App</span></span>
                            </td>
                          </tr>

                          <!-- Body -->
                          <tr>
                            <td style="padding:40px 40px 24px;">
                              <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#1e293b;">%s</h1>
                              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">%s</p>

                              <!-- Button -->
                              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                                <tr>
                                  <td style="background-color:#6366f1;border-radius:6px;">
                                    <a href="%s"
                                       style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                                      %s
                                    </a>
                                  </td>
                                </tr>
                              </table>

                              <!-- Expiry notice -->
                              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#64748b;">%s</p>

                              <!-- Security notice -->
                              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#64748b;">%s</p>

                              <!-- Link fallback -->
                              <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;">%s</p>
                              <p style="margin:0;font-size:12px;word-break:break-all;">
                                <a href="%s" style="color:#6366f1;text-decoration:none;">%s</a>
                              </p>
                            </td>
                          </tr>

                          <!-- Divider -->
                          <tr>
                            <td style="padding:0 40px;">
                              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" />
                            </td>
                          </tr>

                          <!-- Footer -->
                          <tr>
                            <td style="padding:24px 40px;text-align:center;">
                              <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#1e293b;">AgileApp</p>
                              <p style="margin:0 0 12px;font-size:12px;color:#94a3b8;">%s</p>
                              <p style="margin:0;font-size:11px;color:#cbd5e1;">%s</p>
                            </td>
                          </tr>

                        </table>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(
                lang,
                heading,
                heading,
                intro,
                resetLink, btnLabel,
                expiryNotice,
                securityNotice,
                linkFallback,
                resetLink, resetLink,
                footerLine1,
                footerLine2
        );
    }
}