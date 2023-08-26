import type { AvatarConfigurationOptionsModel } from "@/models/avatar-configuration-options-model";

export class AvatarService {
  private _hairConfigurations = [
    { id: "big_hair", name: "Voluminöses Haar" },
    { id: "bob", name: "Bob" },
    { id: "curly", name: "Lockig" },
    { id: "curvy", name: "Gewellt" },
    { id: "frizzle", name: "Kraus" },
    { id: "fro", name: "Afro" },
    { id: "braids", name: "Zöpfe" },
    { id: "buzzcut", name: "Bürstenschnitt" },
    { id: "dreadlocks", name: "Dreadlocks" },
    { id: "einstein_hair", name: "Einstein-Haar" },
  ];

  private _hairColors = [
    { id: "#B58143", name: "Blond" },
    { id: "#724133", name: "Braun" },
    { id: "#2C1B18", name: "Schwarz" },
  ];

  private _skinColors = [
    { id: "#EDB98A", name: "Hell" },
    { id: "#AE5D29", name: "Dunkel" },
  ];

  private _facialHairConfigurations = [
    { id: "", name: "Kein Bart" },
    { id: "beard_light", name: "Leichter Bart" },
    { id: "beard_magestic", name: "Majestätischer Bart" },
  ];

  private _clothings = [
    { id: "hoodie", name: "Hoodie" },
    { id: "collar_sweater", name: "Pullover mit Kragen" },
    { id: "shirt_v_neck", name: "Shirt mit V-Ausschnitt" },
    { id: "shirt_crew_neck", name: "Shirt mit Rundhalsausschnitt" },
  ];

  public get configurationOptions(): AvatarConfigurationOptionsModel {
    return {
      hairConfigurations: this._hairConfigurations,
      hairColors: this._hairColors,
      skinColors: this._skinColors,
      facialHairConfigurations: this._facialHairConfigurations,
      clothings: this._clothings,
    };
  }

  public async loadRandomAvatar() {
    const response = await fetch(
      `${import.meta.env.VITE_MLSERVICES_BASEURL}/api/v1/avatar/`
    );

    return await response.json() as { default: string, configuration: { [key: string]: string } };
  }

  public async loadAvatar(
    hairId: string,
    hairColorId: string,
    skinColorId: string,
    facialHairId: string,
    clothingId: string
  ) {
    const response = await fetch(
      `${import.meta.env.VITE_MLSERVICES_BASEURL}/api/v1/avatar/configure`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hairId,
          hairColorId,
          skinColorId,
          facialHairId,
          clothingId,
        }),
      }
    );

    return await response.json() as { default: string, configuration: { [key: string]: string } };
  }
}
