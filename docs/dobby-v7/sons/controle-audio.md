# Contrôle indépendant des cinq sons DOBBY

Les fichiers occupent ensemble 96700 octets. Les cinq sont en PCM signé 16 bits mono à 24 kHz, avec des durées comprises entre 220 et 560 ms. Python et ffprobe confirment les paramètres des fichiers.

| Son | Durée | Octets | Crête PCM | RMS PCM | Crête à 0,72 | RMS à 0,72 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `confirm.wav` | 220 ms | 10604 | -16.00 dBFS | -26.39 dBFS | -18.85 dBFS | -29.24 dBFS |
| `notification.wav` | 330 ms | 15884 | -16.00 dBFS | -26.73 dBFS | -18.85 dBFS | -29.58 dBFS |
| `reward.wav` | 490 ms | 23564 | -15.00 dBFS | -26.64 dBFS | -17.85 dBFS | -29.49 dBFS |
| `timer.wav` | 560 ms | 26924 | -14.00 dBFS | -24.23 dBFS | -16.85 dBFS | -27.08 dBFS |
| `transition.wav` | 410 ms | 19724 | -17.00 dBFS | -27.98 dBFS | -19.85 dBFS | -30.84 dBFS |

Chaque signal commence et finit à zéro. Sur les trois fenêtres successives de 10 ms au début, le RMS monte. Il descend sur les trois dernières. Aucun échantillon n’atteint les limites du PCM et le décalage continu absolu reste inférieur à 1,3 × 10⁻⁶ de la pleine échelle.

FFmpeg vérifie le coefficient de lecture 0,72 échantillon par échantillon à partir du PCM, soit une atténuation de 2,85 dB sur les crêtes et le RMS. La crête la plus élevée à ce gain est celle du minuteur, à −16,85 dBFS. Le code du lecteur prévoit également une rampe de 15 ms lors d’une interruption. Les mesures à 0,72 décrivent le signal numérique après gain. Le rééchantillonnage Web Audio et le volume matériel ne sont pas mesurés ici. [Mesures, empreintes et méthodes](controle-audio.json)
